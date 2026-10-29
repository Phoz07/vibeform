import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { FieldTypeSchema, validateFieldConfig } from "../schema/field";
import { VibeTokensSchema } from "../schema/vibe";
import { generateSlug } from "../utils/slug";

export const formRouter = router({
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
          .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens")
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

      const updateData: Partial<typeof definitionsSchema.forms.$inferInsert> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
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

      const updateData: Partial<typeof definitionsSchema.fields.$inferInsert> = {};
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
});
