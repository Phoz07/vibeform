import { defineConfig } from "drizzle-kit";
import "varlock/auto-load";

export default defineConfig({
  schema: "./src/schema/definitions.ts",
  out: "./src/migrations/definitions",
  dialect: "sqlite",
  driver: "d1-http",
});
