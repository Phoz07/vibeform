/// <reference types="@cloudflare/workers-types" />

export type DefinitionsDbConfig = {
  DEFINITIONS_DB: D1Database;
};

export type ResponsesDbConfig = {
  RESPONSES_DB: D1Database;
};

export type DatabaseConfig = {
  DB?: D1Database;
  DEFINITIONS_DB?: D1Database;
};
