# 01: Prefactoring: Dual D1 Databases & Monorepo Topology

**What to build:** Establish physical isolation in the project's data architecture by provisioning two discrete Cloudflare D1 databases (`definitionsDb` for Control Plane and `responsesDb` for Data Plane) and an R2 bucket for file attachments within the infrastructure configuration. Separate database schemas and migration workflows so Control Plane tables (`user`, `session`, `mcp_tokens`, `forms`, `fields`) and Data Plane tables (`responses`, `answers`, `attachments`) reside in distinct packages or schema files with no cross-database foreign keys. Scaffold `apps/mcp` as an isolated Hono application possessing a binding only to `definitionsDb`.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `packages/infra/alchemy.run.ts` provisions two D1 databases (`definitionsDb` and `responsesDb`) and an `attachments` R2 bucket
- [ ] `packages/db` provides separate schema definitions and migrations for Control Plane (`definitions`) and Data Plane (`responses`)
- [ ] `apps/mcp` is created in the monorepo workspace as a Hono worker
- [ ] `apps/mcp` environment bindings include only `DEFINITIONS_DB` (and zero bindings to `responsesDb` or R2)
- [ ] `apps/server` environment bindings include `DEFINITIONS_DB`, `RESPONSES_DB`, and `ATTACHMENTS`
- [ ] TypeScript type checks pass across all workspaces with `pnpm run check-types`
