import { trpcServer } from "@hono/trpc-server";
import { appRouter, FileUploadConfigSchema } from "@vibeform/api";
import {
	createAttachmentToken,
	detectMimeType,
	stripImageMetadata,
} from "@vibeform/api/utils/attachment";
import { and, eq, isNull } from "drizzle-orm";
import { initLogger } from "evlog";
import {
	type BetterAuthInstance,
	createAuthMiddleware,
} from "evlog/better-auth";
import { type EvlogVariables, evlog } from "evlog/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createContext } from "./context";
import { ENV } from "./env.server";
import { createAuth, getDefinitionsDb } from "./services";

initLogger({
	env: { service: "vibeform-server" },
});

let identifyUser: ReturnType<typeof createAuthMiddleware> | undefined;

async function getIdentifyUser() {
	identifyUser ??= createAuthMiddleware(
		(await createAuth()) as BetterAuthInstance,
		{
			exclude: ["/api/auth/**"],
			maskEmail: true,
		},
	);
	return identifyUser;
}

const app = new Hono<EvlogVariables>();

const allowedOrigins = new Set([
	"https://vibeform-web-live-phos-yzh42clevvg333kg.maverxk07.workers.dev",
	"http://localhost:3000",
	"http://localhost:3001",
]);

app.use(evlog());
app.use("*", async (c, next) => {
	const middleware = await getIdentifyUser();
	await middleware(c.get("log"), c.req.raw.headers, c.req.path);
	await next();
});

app.use(
	"/*",
	cors({
		origin: (origin) =>
			allowedOrigins.has(origin) || origin === ENV.CORS_ORIGIN
				? origin
				: undefined,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/*", async (c) =>
	(await createAuth()).handler(c.req.raw),
);

app.post("/f/:slug/upload", async (c) => {
	const contentLength = Number(c.req.header("content-length"));
	if (Number.isFinite(contentLength) && contentLength > 52 * 1024 * 1024) {
		return c.json({ error: "Upload size must be below 50 MB" }, 413);
	}
	const formData = await c.req.raw.formData();
	const file = formData.get("file");
	const fieldId = formData.get("fieldId");
	if (!(file instanceof File) || typeof fieldId !== "string") {
		return c.json({ error: "file and fieldId are required" }, 400);
	}

	const definitionsDb = getDefinitionsDb();
	const { definitionsSchema } = await import("@vibeform/db");
	const [form] = await definitionsDb
		.select()
		.from(definitionsSchema.forms)
		.where(
			and(
				eq(definitionsSchema.forms.slug, c.req.param("slug")),
				eq(definitionsSchema.forms.status, "published"),
			),
		);
	if (!form) return c.json({ error: "Published form not found" }, 404);

	const [field] = await definitionsDb
		.select()
		.from(definitionsSchema.fields)
		.where(
			and(
				eq(definitionsSchema.fields.id, fieldId),
				eq(definitionsSchema.fields.formId, form.id),
				isNull(definitionsSchema.fields.deletedAt),
			),
		);
	if (!field || field.type !== "file_upload")
		return c.json({ error: "Invalid upload field" }, 400);

	const config = FileUploadConfigSchema.parse(field.config ?? {});
	if (file.size > config.maxSizeBytes)
		return c.json({ error: "File exceeds the configured size limit" }, 413);
	const bytes = new Uint8Array(await file.arrayBuffer());
	const detectedMimeType = detectMimeType(bytes);
	if (
		!detectedMimeType ||
		!config.allowedMimeTypes.includes(detectedMimeType)
	) {
		return c.json({ error: "File type does not match an allowed format" }, 415);
	}

	const sanitizedBytes = stripImageMetadata(bytes, detectedMimeType);
	const r2Key = `forms/${form.id}/${crypto.randomUUID()}`;
	const bucket = (ENV as unknown as { ATTACHMENTS?: R2Bucket }).ATTACHMENTS;
	if (!bucket)
		return c.json({ error: "Attachment storage is unavailable" }, 503);
	await bucket.put(r2Key, sanitizedBytes, {
		httpMetadata: { contentType: detectedMimeType },
	});

	const payload = {
		id: crypto.randomUUID(),
		formId: form.id,
		fieldId,
		r2Key,
		fileName: file.name.replace(/[^\w.-]+/g, "_").slice(0, 255) || "attachment",
		mimeType: detectedMimeType,
		sizeBytes: sanitizedBytes.byteLength,
		expiresAt: Date.now() + 60 * 60 * 1000,
	};
	const token = await createAttachmentToken(payload, ENV.BETTER_AUTH_SECRET);
	return c.json({ attachmentId: payload.id, token });
});

app.get("/attachments/:id", async (c) => {
	const context = await createContext({ context: c });
	if (!context.session || !context.responsesDb || !context.attachments) {
		return c.json({ error: "Authentication required" }, 401);
	}
	const { responsesSchema, definitionsSchema } = await import("@vibeform/db");
	const [attachment] = await context.responsesDb
		.select()
		.from(responsesSchema.attachments)
		.where(eq(responsesSchema.attachments.id, c.req.param("id")));
	if (!attachment) return c.json({ error: "Attachment not found" }, 404);
	const [answer] = await context.responsesDb
		.select()
		.from(responsesSchema.answers)
		.where(eq(responsesSchema.answers.id, attachment.answerId));
	if (!answer) return c.json({ error: "Attachment not found" }, 404);
	const [response] = await context.responsesDb
		.select()
		.from(responsesSchema.responses)
		.where(eq(responsesSchema.responses.id, answer.responseId));
	const [form] = response
		? await context.definitionsDb
				.select()
				.from(definitionsSchema.forms)
				.where(
					and(
						eq(definitionsSchema.forms.id, response.formId),
						eq(definitionsSchema.forms.ownerId, context.session.user.id),
					),
				)
		: [];
	if (!form) return c.json({ error: "Attachment not found" }, 404);
	const object = await context.attachments.get(attachment.r2Key);
	if (!object) return c.json({ error: "Attachment object not found" }, 404);
	return new Response(object.body, {
		headers: {
			"Content-Type": attachment.mimeType,
			"Content-Disposition": `attachment; filename="${attachment.fileName.replaceAll('"', "")}"`,
		},
	});
});

app.use(
	"/trpc/*",
	trpcServer({
		endpoint: "/trpc",
		router: appRouter,
		createContext: (_opts, context) => {
			return createContext({ context });
		},
	}),
);

app.get("/", (c) => {
	return c.text("OK");
});

export default app;
