import { defineRelationsPart, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const responses = sqliteTable(
  "responses",
  {
    id: text("id").primaryKey(),
    formId: text("form_id").notNull(),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("responses_formId_idx").on(table.formId),
    index("responses_submittedAt_idx").on(table.submittedAt),
  ],
);

export const answers = sqliteTable(
  "answers",
  {
    id: text("id").primaryKey(),
    responseId: text("response_id")
      .notNull()
      .references(() => responses.id, { onDelete: "cascade" }),
    fieldId: text("field_id").notNull(),
    value: text("value", { mode: "json" }),
  },
  (table) => [
    index("answers_responseId_idx").on(table.responseId),
    index("answers_fieldId_idx").on(table.fieldId),
  ],
);

export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    answerId: text("answer_id")
      .notNull()
      .references(() => answers.id, { onDelete: "cascade" }),
    r2Key: text("r2_key").notNull().unique(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("attachments_answerId_idx").on(table.answerId),
    index("attachments_r2Key_idx").on(table.r2Key),
  ],
);

export const responsesRelations = defineRelationsPart(
  { responses, answers, attachments },
  (r) => ({
    responses: {
      answers: r.many.answers({
        from: r.responses.id,
        to: r.answers.responseId,
      }),
    },
    answers: {
      response: r.one.responses({
        from: r.answers.responseId,
        to: r.responses.id,
      }),
      attachments: r.many.attachments({
        from: r.answers.id,
        to: r.attachments.answerId,
      }),
    },
    attachments: {
      answer: r.one.answers({
        from: r.attachments.answerId,
        to: r.answers.id,
      }),
    },
  }),
);
