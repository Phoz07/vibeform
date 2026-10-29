import { defineRelationsPart, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

export * from "./auth";

export const forms = sqliteTable(
	"forms",
	{
		id: text("id").primaryKey(),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		description: text("description"),
		slug: text("slug").notNull().unique(),
		status: text("status", { enum: ["draft", "published", "closed"] })
			.default("draft")
			.notNull(),
		vibeTokens: text("vibe_tokens", { mode: "json" }),
		version: integer("version").default(1).notNull(),
		responseCount: integer("response_count").default(0).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("forms_ownerId_idx").on(table.ownerId),
		index("forms_slug_idx").on(table.slug),
		index("forms_status_idx").on(table.status),
	],
);

export const fields = sqliteTable(
	"fields",
	{
		id: text("id").primaryKey(),
		formId: text("form_id")
			.notNull()
			.references(() => forms.id, { onDelete: "cascade" }),
		type: text("type", {
			enum: [
				"short_text",
				"long_text",
				"single_choice",
				"multiple_choice",
				"rating",
				"date",
				"file_upload",
			],
		}).notNull(),
		label: text("label").notNull(),
		required: integer("required", { mode: "boolean" }).default(false).notNull(),
		position: integer("position").notNull(),
		config: text("config", { mode: "json" }),
		deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("fields_formId_idx").on(table.formId),
		index("fields_position_idx").on(table.formId, table.position),
	],
);

export const mcpTokens = sqliteTable(
	"mcp_tokens",
	{
		id: text("id").primaryKey(),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		tokenHash: text("token_hash").notNull().unique(),
		scopes: text("scopes", { mode: "json" }).$type<string[]>().notNull(),
		lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("mcp_tokens_ownerId_idx").on(table.ownerId),
		index("mcp_tokens_tokenHash_idx").on(table.tokenHash),
	],
);

export const auditLogs = sqliteTable(
	"audit_logs",
	{
		id: text("id").primaryKey(),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		tool: text("tool").notNull(),
		formId: text("form_id"),
		status: text("status", { enum: ["success", "error"] }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [index("audit_logs_ownerId_idx").on(table.ownerId)],
);

export const definitionsRelations = defineRelationsPart(
	{ user, forms, fields, mcpTokens, auditLogs },
	(r) => ({
		user: {
			forms: r.many.forms({
				from: r.user.id,
				to: r.forms.ownerId,
			}),
			mcpTokens: r.many.mcpTokens({
				from: r.user.id,
				to: r.mcpTokens.ownerId,
			}),
		},
		forms: {
			owner: r.one.user({
				from: r.forms.ownerId,
				to: r.user.id,
			}),
			fields: r.many.fields({
				from: r.forms.id,
				to: r.fields.formId,
			}),
		},
		fields: {
			form: r.one.forms({
				from: r.fields.formId,
				to: r.forms.id,
			}),
		},
		mcpTokens: {
			owner: r.one.user({
				from: r.mcpTokens.ownerId,
				to: r.user.id,
			}),
		},
		auditLogs: {
			owner: r.one.user({
				from: r.auditLogs.ownerId,
				to: r.user.id,
			}),
		},
	}),
);
