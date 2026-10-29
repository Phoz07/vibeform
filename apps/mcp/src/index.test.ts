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

	it("does not declare response or attachment worker bindings", async () => {
		const source = await readFile(
			"apps/mcp/src/index.ts",
			"utf8",
		);

		expect(source).not.toContain("RESPONSES_DB");
		expect(source).not.toContain("ATTACHMENTS");
	});
});
