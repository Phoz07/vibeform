import { drizzle } from "drizzle-orm/d1";

import type { DatabaseConfig, DefinitionsDbConfig, ResponsesDbConfig } from "./config";
import { definitionsRelationsCombined, responsesRelationsCombined } from "./relations";
import * as definitionsSchema from "./schema/definitions";
import * as responsesSchema from "./schema/responses";

export function createDefinitionsDb(env: DefinitionsDbConfig | DatabaseConfig) {
  const d1 =
    "DEFINITIONS_DB" in env && env.DEFINITIONS_DB
      ? env.DEFINITIONS_DB
      : (env as DatabaseConfig).DB;
  if (!d1) throw new Error("DEFINITIONS_DB binding is required");
  return drizzle(d1, { relations: definitionsRelationsCombined });
}

export function createResponsesDb(env: ResponsesDbConfig) {
  if (!env.RESPONSES_DB) throw new Error("RESPONSES_DB binding is required");
  return drizzle(env.RESPONSES_DB, { relations: responsesRelationsCombined });
}

// Backward compatibility
export const createDb = createDefinitionsDb;
export type Database = ReturnType<typeof createDefinitionsDb>;
export type DefinitionsDatabase = ReturnType<typeof createDefinitionsDb>;
export type ResponsesDatabase = ReturnType<typeof createResponsesDb>;

export { definitionsSchema, responsesSchema };
export * from "./schema";
export type * from "./config";
