/// <reference types="@cloudflare/workers-types" />
import type { Session } from "@vibeform/auth";
import type { DefinitionsDatabase, ResponsesDatabase } from "@vibeform/db";

export type Context = {
  session: Session | null;
  db: DefinitionsDatabase;
  definitionsDb: DefinitionsDatabase;
  responsesDb?: ResponsesDatabase;
  attachments?: R2Bucket;
};
