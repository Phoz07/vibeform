import { protectedProcedure, publicProcedure, router } from "../index";
import { formRouter } from "./form";

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
});

export type AppRouter = typeof appRouter;
