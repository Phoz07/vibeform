import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../context";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import {
	FieldTypeSchema,
	validateAnswerValue,
	validateFieldConfig,
} from "../schema/field";
import { VibeTokensSchema } from "../schema/vibe";
import {
	type AttachmentTokenPayload,
	verifyAttachmentToken,
} from "../utils/attachment";
import { generateSlug } from "../utils/slug";

async function getPublishedForm(ctx: Context, slug: string) {
	const { definitionsSchema } = await import("@vibeform/db");
	const [form] = await ctx.definitionsDb
		.select()
		.from(definitionsSchema.forms)
		.where(
			and(
				eq(definitionsSchema.forms.slug, slug),
				eq(definitionsSchema.forms.status, "published"),
			),
		);

	if (!form) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Published form not found",
		});
	}

	const fields = await ctx.definitionsDb
		.select()
		.from(definitionsSchema.fields)
		.where(
			and(
				eq(definitionsSchema.fields.formId, form.id),
				isNull(definitionsSchema.fields.deletedAt),
			),
		)
		.orderBy(asc(definitionsSchema.fields.position));

	return { form, fields };
}

export const formRouter = router({
	responses: protectedProcedure
		.input(z.object({ formId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			if (!ctx.responsesDb) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Response storage is unavailable",
				});
			}
			const { definitionsSchema, responsesSchema } = await import(
				"@vibeform/db"
			);
			const [form] = await ctx.definitionsDb
				.select()
				.from(definitionsSchema.forms)
				.where(
					and(
						eq(definitionsSchema.forms.id, input.formId),
						eq(definitionsSchema.forms.ownerId, ctx.session.user.id),
					),
				);
			if (!form)
				throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });

			const fields = await ctx.definitionsDb
				.select()
				.from(definitionsSchema.fields)
				.where(eq(definitionsSchema.fields.formId, form.id));
			const fieldLabels = new Map(
				fields.map((field) => [field.id, field.label]),
			);
			const responses = await ctx.responsesDb
				.select()
				.from(responsesSchema.responses)
				.where(eq(responsesSchema.responses.formId, form.id))
				.orderBy(desc(responsesSchema.responses.submittedAt));
			const result = [];
			for (const response of responses) {
				const answers = await ctx.responsesDb
					.select()
					.from(responsesSchema.answers)
					.where(eq(responsesSchema.answers.responseId, response.id));
				const attachments =
					answers.length > 0
						? await ctx.responsesDb
								.select()
								.from(responsesSchema.attachments)
								.where(
									inArray(
										responsesSchema.attachments.answerId,
										answers.map((answer) => answer.id),
									),
								)
						: [];
				result.push({
					...response,
					answers: answers.map((answer) => ({
						...answer,
						label: fieldLabels.get(answer.fieldId) ?? "Deleted field",
						attachment: (() => {
							const attachment = attachments.find(
								(attachment) => attachment.answerId === answer.id,
							);
							return attachment
								? {
										id: attachment.id,
										fileName: attachment.fileName,
										mimeType: attachment.mimeType,
										sizeBytes: attachment.sizeBytes,
									}
								: null;
						})(),
					})),
				});
			}
			return result;
		}),

	deleteResponse: protectedProcedure
		.input(
			z.object({ formId: z.string().min(1), responseId: z.string().min(1) }),
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.responsesDb) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Response storage is unavailable",
				});
			}
			if (!ctx.attachments) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Attachment storage is unavailable",
				});
			}
			const { definitionsSchema, responsesSchema } = await import(
				"@vibeform/db"
			);
			const [form] = await ctx.definitionsDb
				.select()
				.from(definitionsSchema.forms)
				.where(
					and(
						eq(definitionsSchema.forms.id, input.formId),
						eq(definitionsSchema.forms.ownerId, ctx.session.user.id),
					),
				);
			if (!form)
				throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
			const [response] = await ctx.responsesDb
				.select()
				.from(responsesSchema.responses)
				.where(
					and(
						eq(responsesSchema.responses.id, input.responseId),
						eq(responsesSchema.responses.formId, form.id),
					),
				);
			if (!response) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Response not found",
				});
			}
			const answers = await ctx.responsesDb
				.select()
				.from(responsesSchema.answers)
				.where(eq(responsesSchema.answers.responseId, response.id));
			const attachments =
				answers.length > 0
					? await ctx.responsesDb
							.select()
							.from(responsesSchema.attachments)
							.where(
								inArray(
									responsesSchema.attachments.answerId,
									answers.map((answer) => answer.id),
								),
							)
					: [];
			await ctx.attachments.delete(
				attachments.map((attachment) => attachment.r2Key),
			);
			await ctx.responsesDb
				.delete(responsesSchema.responses)
				.where(eq(responsesSchema.responses.id, response.id));
			await ctx.definitionsDb
				.update(definitionsSchema.forms)
				.set({
					responseCount: sql`max(0, ${definitionsSchema.forms.responseCount} - 1)`,
				})
				.where(eq(definitionsSchema.forms.id, form.id));
			return { success: true };
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.responsesDb) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Response storage is unavailable",
				});
			}
			if (!ctx.attachments) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Attachment storage is unavailable",
				});
			}
			const { definitionsSchema, responsesSchema } = await import(
				"@vibeform/db"
			);
			const [form] = await ctx.definitionsDb
				.select()
				.from(definitionsSchema.forms)
				.where(
					and(
						eq(definitionsSchema.forms.id, input.id),
						eq(definitionsSchema.forms.ownerId, ctx.session.user.id),
					),
				);
			if (!form)
				throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
			const responses = await ctx.responsesDb
				.select()
				.from(responsesSchema.responses)
				.where(eq(responsesSchema.responses.formId, form.id));
			const responseIds = responses.map((response) => response.id);
			const answers =
				responseIds.length > 0
					? await ctx.responsesDb
							.select()
							.from(responsesSchema.answers)
							.where(inArray(responsesSchema.answers.responseId, responseIds))
					: [];
			const attachments =
				answers.length > 0
					? await ctx.responsesDb
							.select()
							.from(responsesSchema.attachments)
							.where(
								inArray(
									responsesSchema.attachments.answerId,
									answers.map((answer) => answer.id),
								),
							)
					: [];
			await ctx.attachments.delete(
				attachments.map((attachment) => attachment.r2Key),
			);
			await ctx.responsesDb
				.delete(responsesSchema.responses)
				.where(eq(responsesSchema.responses.formId, form.id));
			await ctx.definitionsDb
				.delete(definitionsSchema.forms)
				.where(eq(definitionsSchema.forms.id, form.id));
			return { success: true };
		}),

	getPublic: publicProcedure
		.input(z.object({ slug: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const { form, fields } = await getPublishedForm(ctx, input.slug);
			return { ...form, fields };
		}),

	submit: publicProcedure
		.input(
			z.object({
				slug: z.string().min(1),
				answers: z.array(
					z.object({
						fieldId: z.string().min(1),
						value: z.unknown(),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.responsesDb) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Response storage is unavailable",
				});
			}

			const { definitionsSchema, responsesSchema } = await import(
				"@vibeform/db"
			);
			const { form, fields } = await getPublishedForm(ctx, input.slug);
			const fieldById = new Map(fields.map((field) => [field.id, field]));
			const submittedFieldIds = new Set<string>();

			for (const answer of input.answers) {
				const field = fieldById.get(answer.fieldId);
				if (!field || submittedFieldIds.has(answer.fieldId)) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Invalid answer field.",
					});
				}
				submittedFieldIds.add(answer.fieldId);

				try {
					const result = validateAnswerValue(
						field.type,
						field.config,
						answer.value,
						field.required,
					);
					if (!result.valid) {
						throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
					}
				} catch (error) {
					if (error instanceof TRPCError) throw error;
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Invalid answer.",
					});
				}
			}

			for (const field of fields) {
				if (field.required && !submittedFieldIds.has(field.id)) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "All required questions must be answered.",
					});
				}
			}

			const responseId = crypto.randomUUID();
			const attachmentPayloads = new Map<string, AttachmentTokenPayload>();
			const attachmentIdsByField = new Map<string, string>();
			for (const answer of input.answers) {
				const field = fieldById.get(answer.fieldId);
				if (field?.type !== "file_upload") continue;
				if (
					typeof answer.value !== "object" ||
					answer.value === null ||
					Array.isArray(answer.value) ||
					typeof (answer.value as { token?: unknown }).token !== "string" ||
					!ctx.attachmentSecret
				) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Invalid attachment.",
					});
				}
				const payload = await verifyAttachmentToken(
					(answer.value as { token: string }).token,
					ctx.attachmentSecret,
				);
				if (
					!payload ||
					payload.formId !== form.id ||
					payload.fieldId !== field.id ||
					attachmentPayloads.has(payload.id)
				) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Invalid attachment.",
					});
				}
				attachmentPayloads.set(payload.id, payload);
				attachmentIdsByField.set(field.id, payload.id);
			}
			const storedAnswers = input.answers.map((answer) => ({
				...answer,
				storedValue: attachmentIdsByField.get(answer.fieldId) ?? answer.value,
			}));
			await ctx.responsesDb.insert(responsesSchema.responses).values({
				id: responseId,
				formId: form.id,
			});
			if (input.answers.length > 0) {
				await ctx.responsesDb.insert(responsesSchema.answers).values(
					storedAnswers.map((answer) => ({
						id: crypto.randomUUID(),
						responseId,
						fieldId: answer.fieldId,
						value: answer.storedValue,
					})),
				);
			}
			const answerRows = await ctx.responsesDb
				.select()
				.from(responsesSchema.answers)
				.where(eq(responsesSchema.answers.responseId, responseId));
			for (const answer of answerRows) {
				const payload = [...attachmentPayloads.values()].find(
					(candidate) => candidate.fieldId === answer.fieldId,
				);
				if (payload) {
					await ctx.responsesDb.insert(responsesSchema.attachments).values({
						id: payload.id,
						answerId: answer.id,
						r2Key: payload.r2Key,
						fileName: payload.fileName,
						mimeType: payload.mimeType,
						sizeBytes: payload.sizeBytes,
					});
				}
			}
			await ctx.definitionsDb
				.update(definitionsSchema.forms)
				.set({
					responseCount: sql`${definitionsSchema.forms.responseCount} + 1`,
				})
				.where(eq(definitionsSchema.forms.id, form.id));

			return { responseId };
		}),

	list: protectedProcedure.query(async ({ ctx }) => {
		const { definitionsSchema } = await import("@vibeform/db");
		const formsList = await ctx.definitionsDb
			.select()
			.from(definitionsSchema.forms)
			.where(eq(definitionsSchema.forms.ownerId, ctx.session.user.id))
			.orderBy(desc(definitionsSchema.forms.updatedAt));

		return formsList;
	}),

	create: protectedProcedure
		.input(
			z.object({
				title: z.string().min(1).max(255),
				description: z.string().max(1000).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { definitionsSchema } = await import("@vibeform/db");
			const formId = crypto.randomUUID();
			const slug = generateSlug();

			const [newForm] = await ctx.definitionsDb
				.insert(definitionsSchema.forms)
				.values({
					id: formId,
					ownerId: ctx.session.user.id,
					title: input.title,
					description: input.description,
					slug,
					status: "draft",
					version: 1,
				})
				.returning();

			return newForm;
		}),

	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const { definitionsSchema } = await import("@vibeform/db");

			const [form] = await ctx.definitionsDb
				.select()
				.from(definitionsSchema.forms)
				.where(
					and(
						eq(definitionsSchema.forms.id, input.id),
						eq(definitionsSchema.forms.ownerId, ctx.session.user.id),
					),
				);

			if (!form) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Form not found or access denied",
				});
			}

			const activeFields = await ctx.definitionsDb
				.select()
				.from(definitionsSchema.fields)
				.where(
					and(
						eq(definitionsSchema.fields.formId, form.id),
						isNull(definitionsSchema.fields.deletedAt),
					),
				)
				.orderBy(asc(definitionsSchema.fields.position));

			return {
				...form,
				fields: activeFields,
			};
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				title: z.string().min(1).max(255).optional(),
				description: z.string().max(1000).optional(),
				slug: z
					.string()
					.min(3)
					.max(64)
					.regex(
						/^[a-z0-9-]+$/,
						"Slug must only contain lowercase letters, numbers, and hyphens",
					)
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { definitionsSchema } = await import("@vibeform/db");

			const [existing] = await ctx.definitionsDb
				.select()
				.from(definitionsSchema.forms)
				.where(
					and(
						eq(definitionsSchema.forms.id, input.id),
						eq(definitionsSchema.forms.ownerId, ctx.session.user.id),
					),
				);

			if (!existing) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
			}

			const updateData: Partial<typeof definitionsSchema.forms.$inferInsert> =
				{};
			if (input.title !== undefined) updateData.title = input.title;
			if (input.description !== undefined)
				updateData.description = input.description;
			if (input.slug !== undefined) updateData.slug = input.slug;

			const [updated] = await ctx.definitionsDb
				.update(definitionsSchema.forms)
				.set(updateData)
				.where(eq(definitionsSchema.forms.id, input.id))
				.returning();

			return updated;
		}),

	addField: protectedProcedure
		.input(
			z.object({
				formId: z.string(),
				type: FieldTypeSchema,
				label: z.string().min(1).max(255),
				required: z.boolean().default(false),
				position: z.number().int().optional(),
				config: z.unknown().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { definitionsSchema } = await import("@vibeform/db");

			const [form] = await ctx.definitionsDb
				.select()
				.from(definitionsSchema.forms)
				.where(
					and(
						eq(definitionsSchema.forms.id, input.formId),
						eq(definitionsSchema.forms.ownerId, ctx.session.user.id),
					),
				);

			if (!form) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
			}

			const validatedConfig = validateFieldConfig(input.type, input.config);

			let position = input.position;
			if (position === undefined) {
				const existing = await ctx.definitionsDb
					.select()
					.from(definitionsSchema.fields)
					.where(
						and(
							eq(definitionsSchema.fields.formId, input.formId),
							isNull(definitionsSchema.fields.deletedAt),
						),
					);
				position = existing.length;
			}

			const [field] = await ctx.definitionsDb
				.insert(definitionsSchema.fields)
				.values({
					id: crypto.randomUUID(),
					formId: input.formId,
					type: input.type,
					label: input.label,
					required: input.required,
					position,
					config: JSON.stringify(validatedConfig),
				})
				.returning();

			return field;
		}),

	updateField: protectedProcedure
		.input(
			z.object({
				fieldId: z.string(),
				label: z.string().min(1).max(255).optional(),
				required: z.boolean().optional(),
				config: z.unknown().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { definitionsSchema } = await import("@vibeform/db");

			const [field] = await ctx.definitionsDb
				.select()
				.from(definitionsSchema.fields)
				.where(
					and(
						eq(definitionsSchema.fields.id, input.fieldId),
						isNull(definitionsSchema.fields.deletedAt),
					),
				);

			if (!field) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Field not found" });
			}

			// Check ownership
			const [form] = await ctx.definitionsDb
				.select()
				.from(definitionsSchema.forms)
				.where(
					and(
						eq(definitionsSchema.forms.id, field.formId),
						eq(definitionsSchema.forms.ownerId, ctx.session.user.id),
					),
				);

			if (!form) {
				throw new TRPCError({ code: "UNAUTHORIZED", message: "Access denied" });
			}

			const updateData: Partial<typeof definitionsSchema.fields.$inferInsert> =
				{};
			if (input.label !== undefined) updateData.label = input.label;
			if (input.required !== undefined) updateData.required = input.required;
			if (input.config !== undefined) {
				const parsed = validateFieldConfig(field.type as any, input.config);
				updateData.config = JSON.stringify(parsed);
			}

			const [updated] = await ctx.definitionsDb
				.update(definitionsSchema.fields)
				.set(updateData)
				.where(eq(definitionsSchema.fields.id, input.fieldId))
				.returning();

			return updated;
		}),

	reorderFields: protectedProcedure
		.input(
			z.object({
				formId: z.string(),
				fieldIds: z.array(z.string()),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { definitionsSchema } = await import("@vibeform/db");

			const [form] = await ctx.definitionsDb
				.select()
				.from(definitionsSchema.forms)
				.where(
					and(
						eq(definitionsSchema.forms.id, input.formId),
						eq(definitionsSchema.forms.ownerId, ctx.session.user.id),
					),
				);

			if (!form) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
			}

			// Update positions
			for (let i = 0; i < input.fieldIds.length; i++) {
				const fieldId = input.fieldIds[i];
				if (!fieldId) continue;
				await ctx.definitionsDb
					.update(definitionsSchema.fields)
					.set({ position: i })
					.where(
						and(
							eq(definitionsSchema.fields.id, fieldId),
							eq(definitionsSchema.fields.formId, input.formId),
						),
					);
			}

			return { success: true };
		}),

	removeField: protectedProcedure
		.input(z.object({ fieldId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const { definitionsSchema } = await import("@vibeform/db");

			const [field] = await ctx.definitionsDb
				.select()
				.from(definitionsSchema.fields)
				.where(
					and(
						eq(definitionsSchema.fields.id, input.fieldId),
						isNull(definitionsSchema.fields.deletedAt),
					),
				);

			if (!field) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Field not found" });
			}

			const [form] = await ctx.definitionsDb
				.select()
				.from(definitionsSchema.forms)
				.where(
					and(
						eq(definitionsSchema.forms.id, field.formId),
						eq(definitionsSchema.forms.ownerId, ctx.session.user.id),
					),
				);

			if (!form) {
				throw new TRPCError({ code: "UNAUTHORIZED", message: "Access denied" });
			}

			// Soft delete: set deletedAt
			const [softDeleted] = await ctx.definitionsDb
				.update(definitionsSchema.fields)
				.set({ deletedAt: new Date() })
				.where(eq(definitionsSchema.fields.id, input.fieldId))
				.returning();

			return softDeleted;
		}),

	setVibe: protectedProcedure
		.input(
			z.object({
				formId: z.string(),
				vibeTokens: VibeTokensSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { definitionsSchema } = await import("@vibeform/db");

			const [form] = await ctx.definitionsDb
				.select()
				.from(definitionsSchema.forms)
				.where(
					and(
						eq(definitionsSchema.forms.id, input.formId),
						eq(definitionsSchema.forms.ownerId, ctx.session.user.id),
					),
				);

			if (!form) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
			}

			const [updated] = await ctx.definitionsDb
				.update(definitionsSchema.forms)
				.set({ vibeTokens: JSON.stringify(input.vibeTokens) })
				.where(eq(definitionsSchema.forms.id, input.formId))
				.returning();

			return updated;
		}),

	setStatus: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				status: z.enum(["draft", "published", "closed"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { definitionsSchema } = await import("@vibeform/db");

			const [form] = await ctx.definitionsDb
				.select()
				.from(definitionsSchema.forms)
				.where(
					and(
						eq(definitionsSchema.forms.id, input.id),
						eq(definitionsSchema.forms.ownerId, ctx.session.user.id),
					),
				);

			if (!form) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
			}

			const allowedTransitions: Record<string, string[]> = {
				draft: ["published"],
				published: ["draft", "closed"],
				closed: ["published"],
			};
			if (!allowedTransitions[form.status]?.includes(input.status)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Cannot transition form from ${form.status} to ${input.status}`,
				});
			}

			const [updated] = await ctx.definitionsDb
				.update(definitionsSchema.forms)
				.set({ status: input.status })
				.where(eq(definitionsSchema.forms.id, input.id))
				.returning();

			return updated;
		}),
});
