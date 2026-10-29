import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { generateMcpToken, hashMcpToken } from "../utils/mcp-token";

export const mcpTokenRouter = router({
	list: protectedProcedure.query(async ({ ctx }) => {
		const { definitionsSchema } = await import("@vibeform/db");
		return ctx.definitionsDb
			.select({
				id: definitionsSchema.mcpTokens.id,
				name: definitionsSchema.mcpTokens.name,
				scopes: definitionsSchema.mcpTokens.scopes,
				lastUsedAt: definitionsSchema.mcpTokens.lastUsedAt,
				expiresAt: definitionsSchema.mcpTokens.expiresAt,
				createdAt: definitionsSchema.mcpTokens.createdAt,
			})
			.from(definitionsSchema.mcpTokens)
			.where(eq(definitionsSchema.mcpTokens.ownerId, ctx.session.user.id))
			.orderBy(desc(definitionsSchema.mcpTokens.createdAt));
	}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().trim().min(1).max(100),
				scope: z.enum(["forms:read", "forms:write"]),
				expiresAt: z.number().int().positive().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { definitionsSchema } = await import("@vibeform/db");
			const token = generateMcpToken();
			const [created] = await ctx.definitionsDb
				.insert(definitionsSchema.mcpTokens)
				.values({
					id: crypto.randomUUID(),
					ownerId: ctx.session.user.id,
					name: input.name,
					tokenHash: await hashMcpToken(token),
					scopes: [input.scope],
					expiresAt:
						input.expiresAt == null ? null : new Date(input.expiresAt),
				})
				.returning({
					id: definitionsSchema.mcpTokens.id,
					name: definitionsSchema.mcpTokens.name,
					scopes: definitionsSchema.mcpTokens.scopes,
					expiresAt: definitionsSchema.mcpTokens.expiresAt,
				});
			return { token, ...created };
		}),

	revoke: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const { definitionsSchema } = await import("@vibeform/db");
			const deleted = await ctx.definitionsDb
				.delete(definitionsSchema.mcpTokens)
				.where(
					and(
						eq(definitionsSchema.mcpTokens.id, input.id),
						eq(definitionsSchema.mcpTokens.ownerId, ctx.session.user.id),
					),
				)
				.returning({ id: definitionsSchema.mcpTokens.id });
			if (deleted.length === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "MCP token not found",
				});
			}
			return { success: true };
		}),
});
