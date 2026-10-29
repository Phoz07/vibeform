import { protectedProcedure, publicProcedure, router } from "../index";
import { formRouter } from "./form";
import { mcpTokenRouter } from "./mcp-token";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  form: formRouter,
  mcpToken: mcpTokenRouter,
});

export type AppRouter = typeof appRouter;
