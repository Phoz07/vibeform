import { FieldTypeSchema, validateFieldConfig } from "@vibeform/api";
import { VibeTokensSchema } from "@vibeform/api/schema/vibe";
import { hashMcpToken } from "@vibeform/api/utils/mcp-token";
import { createDefinitionsDb, definitionsSchema } from "@vibeform/db";
import { and, asc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

type Bindings = { DEFINITIONS_DB: D1Database; CORS_ORIGIN: string };
type Auth = { ownerId: string; scopes: string[]; tokenId: string };
type RpcRequest = {
	jsonrpc?: string;
	id?: string | number | null;
	method?: string;
	params?: Record<string, unknown>;
};

const RpcRequestSchema = z
	.object({
		jsonrpc: z.literal("2.0"),
		id: z.union([z.string(), z.number(), z.null()]).optional(),
		method: z.string().min(1),
		params: z.record(z.string(), z.unknown()).optional(),
	})
	.strict();

const ToolCallParamsSchema = z
	.object({
		name: z.string().min(1),
		arguments: z.record(z.string(), z.unknown()).optional(),
	})
	.strict();

const app = new Hono<{ Bindings: Bindings }>();

const securityHeaders = {
	"Content-Security-Policy":
		"default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
	"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

app.use("*", async (c, next) => {
	await next();
	for (const [name, value] of Object.entries(securityHeaders)) {
		c.header(name, value);
	}
});

app.use(
	"/*",
	cors({
		origin: (origin, c) => (origin === c.env.CORS_ORIGIN ? origin : undefined),
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "Mcp-Session-Id"],
		credentials: true,
	}),
);

const toolDefinitions = [
	{
		name: "list_forms",
		description: "List the owner's forms.",
		inputSchema: { type: "object", properties: {} },
	},
	{
		name: "get_form_definition",
		description: "Read a form and its active fields.",
		inputSchema: {
			type: "object",
			properties: { formId: { type: "string" } },
			required: ["formId"],
		},
	},
	{
		name: "get_response_count",
		description: "Read an aggregate response count without respondent data.",
		inputSchema: {
			type: "object",
			properties: { formId: { type: "string" } },
			required: ["formId"],
		},
	},
	{
		name: "create_form",
		description: "Create a draft form.",
		inputSchema: {
			type: "object",
			properties: {
				title: { type: "string" },
				description: { type: "string" },
			},
			required: ["title"],
		},
	},
	{
		name: "add_field",
		description: "Add a field to a draft form.",
		inputSchema: {
			type: "object",
			properties: {
				formId: { type: "string" },
				type: { type: "string" },
				label: { type: "string" },
				required: { type: "boolean" },
				config: { type: "object" },
			},
			required: ["formId", "type", "label"],
		},
	},
	{
		name: "update_field",
		description: "Update a field definition.",
		inputSchema: {
			type: "object",
			properties: {
				fieldId: { type: "string" },
				label: { type: "string" },
				required: { type: "boolean" },
				config: { type: "object" },
			},
			required: ["fieldId"],
		},
	},
	{
		name: "remove_field",
		description: "Soft-delete a field.",
		inputSchema: {
			type: "object",
			properties: { fieldId: { type: "string" } },
			required: ["fieldId"],
		},
	},
	{
		name: "reorder_fields",
		description: "Set field order.",
		inputSchema: {
			type: "object",
			properties: {
				formId: { type: "string" },
				fieldIds: { type: "array", items: { type: "string" } },
			},
			required: ["formId", "fieldIds"],
		},
	},
	{
		name: "set_vibe",
		description: "Set whitelisted form design tokens.",
		inputSchema: {
			type: "object",
			properties: {
				formId: { type: "string" },
				vibeTokens: { type: "object" },
			},
			required: ["formId", "vibeTokens"],
		},
	},
];

const toolNames = new Set(toolDefinitions.map((tool) => tool.name));
const toolArgumentSchemas: Record<string, z.ZodType> = {
	list_forms: z.object({}).strict(),
	get_form_definition: z.object({ formId: z.string() }).strict(),
	get_response_count: z.object({ formId: z.string() }).strict(),
	create_form: z
		.object({
			title: z.string().min(1).max(255),
			description: z.string().optional(),
		})
		.strict(),
	add_field: z
		.object({
			formId: z.string(),
			type: FieldTypeSchema,
			label: z.string().min(1).max(255),
			required: z.boolean().optional(),
			config: z.unknown().optional(),
		})
		.strict(),
	update_field: z
		.object({
			fieldId: z.string(),
			label: z.string().min(1).max(255).optional(),
			required: z.boolean().optional(),
			config: z.unknown().optional(),
		})
		.strict(),
	remove_field: z.object({ fieldId: z.string() }).strict(),
	reorder_fields: z
		.object({ formId: z.string(), fieldIds: z.array(z.string()) })
		.strict(),
	set_vibe: z
		.object({ formId: z.string(), vibeTokens: VibeTokensSchema })
		.strict(),
};

class McpAuthorizationError extends Error {
	constructor(
		message: string,
		readonly code = -32003,
	) {
		super(message);
	}
}

function rpcError(id: RpcRequest["id"], code: number, message: string) {
	return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function authenticate(c: {
	req: { header(name: string): string | undefined };
	env: Bindings;
}) {
	const header = c.req.header("authorization");
	const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
	if (!token) return null;
	const db = createDefinitionsDb(c.env);
	const tokenHash = await hashMcpToken(token);
	const [record] = await db
		.select()
		.from(definitionsSchema.mcpTokens)
		.where(eq(definitionsSchema.mcpTokens.tokenHash, tokenHash));
	if (!record || (record.expiresAt && record.expiresAt.getTime() <= Date.now()))
		return null;
	await db
		.update(definitionsSchema.mcpTokens)
		.set({ lastUsedAt: new Date() })
		.where(eq(definitionsSchema.mcpTokens.id, record.id));
	return {
		ownerId: record.ownerId,
		scopes: record.scopes,
		tokenId: record.id,
	} satisfies Auth;
}

function requireScope(auth: Auth, scope: "forms:read" | "forms:write") {
	return (
		auth.scopes.includes(scope) ||
		(scope === "forms:read" && auth.scopes.includes("forms:write"))
	);
}

async function ownedForm(
	db: ReturnType<typeof createDefinitionsDb>,
	ownerId: string,
	formId: string,
) {
	const [form] = await db
		.select()
		.from(definitionsSchema.forms)
		.where(
			and(
				eq(definitionsSchema.forms.id, formId),
				eq(definitionsSchema.forms.ownerId, ownerId),
			),
		);
	return form;
}

async function callTool(
	db: ReturnType<typeof createDefinitionsDb>,
	auth: Auth,
	name: string,
	args: Record<string, unknown>,
) {
	const readOnly = [
		"list_forms",
		"get_form_definition",
		"get_response_count",
	].includes(name);
	if (!requireScope(auth, readOnly ? "forms:read" : "forms:write")) {
		throw new McpAuthorizationError("Insufficient MCP token scope");
	}

	if (name === "list_forms") {
		return db
			.select()
			.from(definitionsSchema.forms)
			.where(eq(definitionsSchema.forms.ownerId, auth.ownerId));
	}
	if (name === "get_form_definition" || name === "get_response_count") {
		const formId = z.string().parse(args.formId);
		const form = await ownedForm(db, auth.ownerId, formId);
		if (!form) throw new McpAuthorizationError("Form not found", -32004);
		if (name === "get_response_count")
			return { formId, responseCount: form.responseCount };
		const fields = await db
			.select()
			.from(definitionsSchema.fields)
			.where(
				and(
					eq(definitionsSchema.fields.formId, formId),
					isNull(definitionsSchema.fields.deletedAt),
				),
			)
			.orderBy(asc(definitionsSchema.fields.position));
		return { ...form, fields };
	}
	if (name === "create_form") {
		const title = z.string().min(1).max(255).parse(args.title);
		const [form] = await db
			.insert(definitionsSchema.forms)
			.values({
				id: crypto.randomUUID(),
				ownerId: auth.ownerId,
				title,
				description:
					typeof args.description === "string" ? args.description : undefined,
				slug: `draft-${crypto.randomUUID().slice(0, 12)}`,
				status: "draft",
				version: 1,
			})
			.returning();
		return form;
	}
	if (name === "add_field") {
		const formId = z.string().parse(args.formId);
		const form = await ownedForm(db, auth.ownerId, formId);
		if (!form) throw new McpAuthorizationError("Form not found", -32004);
		const type = FieldTypeSchema.parse(args.type);
		const config = validateFieldConfig(type, args.config);
		const existing = await db
			.select()
			.from(definitionsSchema.fields)
			.where(
				and(
					eq(definitionsSchema.fields.formId, formId),
					isNull(definitionsSchema.fields.deletedAt),
				),
			);
		const [field] = await db
			.insert(definitionsSchema.fields)
			.values({
				id: crypto.randomUUID(),
				formId,
				type,
				label: z.string().min(1).max(255).parse(args.label),
				required: args.required === true,
				position: existing.length,
				config: JSON.stringify(config),
			})
			.returning();
		return field;
	}
	if (name === "update_field") {
		const fieldId = z.string().parse(args.fieldId);
		const [field] = await db
			.select()
			.from(definitionsSchema.fields)
			.where(
				and(
					eq(definitionsSchema.fields.id, fieldId),
					isNull(definitionsSchema.fields.deletedAt),
				),
			);
		if (!field || !(await ownedForm(db, auth.ownerId, field.formId)))
			throw new McpAuthorizationError("Field not found", -32004);
		const update: Partial<typeof definitionsSchema.fields.$inferInsert> = {};
		if (typeof args.label === "string")
			update.label = z.string().min(1).max(255).parse(args.label);
		if (typeof args.required === "boolean") update.required = args.required;
		if (args.config !== undefined)
			update.config = JSON.stringify(
				validateFieldConfig(field.type, args.config),
			);
		const [updated] = await db
			.update(definitionsSchema.fields)
			.set(update)
			.where(eq(definitionsSchema.fields.id, fieldId))
			.returning();
		return updated;
	}
	if (name === "remove_field") {
		const fieldId = z.string().parse(args.fieldId);
		const [field] = await db
			.select()
			.from(definitionsSchema.fields)
			.where(
				and(
					eq(definitionsSchema.fields.id, fieldId),
					isNull(definitionsSchema.fields.deletedAt),
				),
			);
		if (!field || !(await ownedForm(db, auth.ownerId, field.formId)))
			throw new McpAuthorizationError("Field not found", -32004);
		const [removed] = await db
			.update(definitionsSchema.fields)
			.set({ deletedAt: new Date() })
			.where(eq(definitionsSchema.fields.id, fieldId))
			.returning();
		return removed;
	}
	if (name === "reorder_fields") {
		const formId = z.string().parse(args.formId);
		if (!(await ownedForm(db, auth.ownerId, formId)))
			throw new McpAuthorizationError("Form not found", -32004);
		const fieldIds = z.array(z.string()).parse(args.fieldIds);
		const activeFields = await db
			.select({ id: definitionsSchema.fields.id })
			.from(definitionsSchema.fields)
			.where(
				and(
					eq(definitionsSchema.fields.formId, formId),
					isNull(definitionsSchema.fields.deletedAt),
				),
			);
		const activeIds = new Set(activeFields.map((field) => field.id));
		if (
			fieldIds.length !== activeIds.size ||
			new Set(fieldIds).size !== fieldIds.length ||
			fieldIds.some((fieldId) => !activeIds.has(fieldId))
		) {
			throw new Error("fieldIds must contain every active field exactly once");
		}
		for (const [position, fieldId] of fieldIds.entries()) {
			await db
				.update(definitionsSchema.fields)
				.set({ position })
				.where(
					and(
						eq(definitionsSchema.fields.id, fieldId),
						eq(definitionsSchema.fields.formId, formId),
					),
				);
		}
		return { success: true };
	}
	if (name === "set_vibe") {
		const formId = z.string().parse(args.formId);
		if (!(await ownedForm(db, auth.ownerId, formId)))
			throw new McpAuthorizationError("Form not found", -32004);
		const vibeTokens = VibeTokensSchema.parse(args.vibeTokens);
		const [updated] = await db
			.update(definitionsSchema.forms)
			.set({ vibeTokens: JSON.stringify(vibeTokens) })
			.where(eq(definitionsSchema.forms.id, formId))
			.returning();
		return updated;
	}
	throw new Error(`Unknown tool: ${name}`);
}

app.post("/mcp", async (c) => {
	let request: RpcRequest;
	try {
		request = RpcRequestSchema.parse(await c.req.json());
	} catch {
		return c.json(rpcError(null, -32600, "Invalid Request"));
	}
	const auth = await authenticate(c);
	if (!auth) return c.json(rpcError(request.id, -32001, "Unauthorized"), 401);
	if (request.method === "initialize") {
		return c.json({
			jsonrpc: "2.0",
			id: request.id ?? null,
			result: {
				protocolVersion: "2025-03-26",
				capabilities: { tools: {} },
				serverInfo: { name: "vibeform", version: "1.0.0" },
			},
		});
	}
	if (request.method === "notifications/initialized") return c.body(null, 202);
	if (request.method === "tools/list")
		return c.json({
			jsonrpc: "2.0",
			id: request.id ?? null,
			result: { tools: toolDefinitions },
		});
	if (request.method === "tools/call") {
		const parsedParams = ToolCallParamsSchema.safeParse(request.params);
		if (!parsedParams.success || !toolNames.has(parsedParams.data.name)) {
			return c.json(rpcError(request.id, -32602, "Invalid tool call"));
		}
		const name = parsedParams.data.name;
		const args = parsedParams.data.arguments ?? {};
		const parsedArgs = toolArgumentSchemas[name]?.safeParse(args);
		if (!parsedArgs?.success) {
			return c.json(rpcError(request.id, -32602, "Invalid tool arguments"));
		}
		try {
			const result = await callTool(
				createDefinitionsDb(c.env),
				auth,
				name,
				args,
			);
			return c.json({
				jsonrpc: "2.0",
				id: request.id ?? null,
				result: { content: [{ type: "text", text: JSON.stringify(result) }] },
			});
		} catch (error) {
			if (error instanceof McpAuthorizationError)
				return c.json(rpcError(request.id, error.code, error.message));
			return c.json({
				jsonrpc: "2.0",
				id: request.id ?? null,
				result: {
					isError: true,
					content: [
						{
							type: "text",
							text:
								error instanceof Error
									? error.message
									: "Tool execution failed",
						},
					],
				},
			});
		}
	}
	return c.json(rpcError(request.id, -32601, "Method not found"));
});

app.get("/mcp", async (c) => {
	const auth = await authenticate(c);
	if (!auth) return c.json(rpcError(null, -32001, "Unauthorized"), 401);
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(
				new TextEncoder().encode("event: endpoint\ndata: /mcp\n\n"),
			);
		},
	});
	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
});

app.get("/", (c) => c.json({ service: "vibeform-mcp", status: "running" }));
app.get("/health", (c) => c.text("OK"));

export default app;
