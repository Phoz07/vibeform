# 08: Tracer Bullet 7: Physical Isolation Assertion & Integration Test Suite

**What to build:** Implement an automated test suite operating at the HTTP Worker boundary (`app.request`) that exercises the entire end-to-end lifecycle: form creation via MCP, human publication via the Web Dashboard, response submission by a respondent, and response review on the Dashboard. Write an explicit isolation test that programmatically inspects the MCP Worker runtime environment, verifying that no binding to `responsesDb` or R2 exists, and asserting that any attempt to query response data through the MCP Worker yields protocol-level failures.

**Blocked by:** 06 (Tracer Bullet 5: MCP Token Management & MCP Worker Control Plane), 07 (Tracer Bullet 6: Dashboard Responses & Synchronous Cascade Cleanup).

**Status:** ready-for-agent

- [ ] Automated HTTP seam test covers full E2E flow (create draft -> publish -> submit -> review -> cascade delete)
- [ ] Isolation test explicitly asserts that `apps/mcp` has no environment bindings to `RESPONSES_DB` or `ATTACHMENTS`
- [ ] Isolation test proves prompt injections or tool calls cannot retrieve respondent answers or file objects via MCP
- [ ] Authorization tests assert cross-user boundary protection (IDOR defenses) across all routes
- [ ] All tests execute cleanly and pass via the test runner
