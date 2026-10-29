# 06: Tracer Bullet 5: MCP Token Management & MCP Worker Control Plane

**What to build:** Allow an Owner to generate, view, and revoke high-entropy MCP Tokens from their Web Dashboard (stored as SHA-256 hashes with scopes `forms:read` or `forms:write` in `definitions-db`). Implement the Model Context Protocol over Streamable HTTP and SSE on `apps/mcp` (`/mcp`), authenticating via `Authorization: Bearer <mcp_token>`. The MCP Worker exposes tools to list forms, inspect definitions, create form drafts, add/update/reorder/soft-delete fields, set Vibes, and fetch response counts. The MCP Worker strictly does NOT expose any publish tool and has no tools or bindings to access response data.

**Blocked by:** 02 (Tracer Bullet 1: Form Builder & Field Management), 03 (Tracer Bullet 2: Vibe Engine & Design Tokens).

**Status:** ready-for-agent

- [ ] Owner can generate and revoke scoped MCP Tokens from the Web Dashboard
- [ ] Only SHA-256 hashes of MCP Tokens are stored in `mcp_tokens` in `definitions-db`
- [ ] `apps/mcp` accepts connections via Streamable HTTP and SSE with Bearer auth
- [ ] MCP tools implemented: `list_forms`, `get_form_definition`, `create_form`, `add_field`, `update_field`, `remove_field`, `reorder_fields`, `set_vibe`, `get_response_count`
- [ ] Tool execution is restricted by token scopes (`forms:read` vs `forms:write`)
- [ ] MCP Worker contains no `publish_form` tool and no tools to read response contents
- [ ] External client (Claude Desktop / MCP Inspector) can connect and successfully manipulate form drafts
