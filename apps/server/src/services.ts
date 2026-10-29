import { createAuth as createConfiguredAuth } from "@vibeform/auth";
import {
  type DefinitionsDatabase,
  type ResponsesDatabase,
  createDefinitionsDb,
  createResponsesDb,
} from "@vibeform/db";

import { ENV } from "./env.server";

export function getDefinitionsDb(): DefinitionsDatabase {
  return createDefinitionsDb(ENV);
}

export function getResponsesDb(): ResponsesDatabase {
  return createResponsesDb(ENV);
}

// Backward compatibility alias
export const getDb = getDefinitionsDb;

export async function createAuth(database?: DefinitionsDatabase) {
  return createConfiguredAuth(ENV, database ?? (await getDefinitionsDb()));
}
