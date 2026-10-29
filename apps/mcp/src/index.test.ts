import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import app from "./index";

describe("MCP worker HTTP boundary", () => {
	it("reports health without data-plane bindings", async () => {
		const response = await app.request("/health", undefined, {
			DEFINITIONS_DB: {} as D1Database,
		});

		expect(response.status).toBe(200);
		expect(await response.text()).toBe("OK");
	});

	it("rejects unauthenticated attempts to retrieve respondent data", async () => {
		const response = await app.request(
			"/mcp",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "tools/call",
					params: {
						name: "get_response",
						arguments: { formId: "private-form" },
					},
				}),
			},
			{ DEFINITIONS_DB: {} as D1Database },
		);
		const body = (await response.json()) as {
			error?: { code?: number };
		};

		expect(response.status).toBe(401);
		expect(body.error?.code).toBe(-32001);
	});

	it("rejects unauthenticated MCP sessions", async () => {
		const response = await app.request("/mcp", undefined, {
			DEFINITIONS_DB: {} as D1Database,
		});

		expect(response.status).toBe(401);
	});

	it("returns JSON-RPC errors for malformed requests", async () => {
		const response = await app.request(
			"/mcp",
			{
				method: "POST",
				headers: {
					Authorization: "Bearer invalid",
					"Content-Type": "application/json",
				},
				body: "{",
			},
			{ DEFINITIONS_DB: {} as D1Database },
		);

		const body = (await response.json()) as {
			error?: { code?: number };
		};
		expect(body.error?.code).toBe(-32600);
	});

	it("returns security headers on health responses", async () => {
		const response = await app.request("/health", undefined, {
			DEFINITIONS_DB: {} as D1Database,
		});

		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(response.headers.get("referrer-policy")).toBe(
			"strict-origin-when-cross-origin",
		);
	});

	it("keeps response data and file storage outside the MCP worker", async () => {
		const source = await readFile("apps/mcp/src/index.ts", "utf8");

		expect(source).toContain(
			"type Bindings = { DEFINITIONS_DB: D1Database; CORS_ORIGIN: string }",
		);
		expect(source).not.toContain("RESPONSES_DB");
		expect(source).not.toContain("ATTACHMENTS");
		expect(source).not.toMatch(/name:\s*"(?:get|list|read)_responses?"/);
		expect(source).not.toContain("r2Key");
	});
});
