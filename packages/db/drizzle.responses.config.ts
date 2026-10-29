import { defineConfig } from "drizzle-kit";
import "varlock/auto-load";

export default defineConfig({
  schema: "./src/schema/responses.ts",
  out: "./src/migrations/responses",
  dialect: "sqlite",
  driver: "d1-http",
});
