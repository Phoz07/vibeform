import { describe, expect, it } from "vitest";

import { validateAnswerValue, validateFieldConfig } from "./field";

describe("field schemas and answer validation", () => {
	it.each([
		["short_text", { minLength: 2, maxLength: 5 }],
		["long_text", { placeholder: "Details" }],
		["single_choice", { options: ["One", "Two"] }],
		["multiple_choice", { options: ["One", "Two"], maxSelections: 2 }],
		["rating", { maxRating: 5 }],
		["date", { minDate: "2026-01-01" }],
		[
			"file_upload",
			{ maxSizeBytes: 1024, allowedMimeTypes: ["application/pdf"] },
		],
	] as const)("%s accepts its valid configuration", (type, config) => {
		expect(() => validateFieldConfig(type, config)).not.toThrow();
	});

	it("rejects malformed choice configuration", () => {
		expect(() =>
			validateFieldConfig("single_choice", { options: [] }),
		).toThrow();
	});

	it.each([
		["short_text", {}, "hello"],
		["long_text", {}, "long answer"],
		["single_choice", { options: ["Yes", "No"] }, "Yes"],
		["multiple_choice", { options: ["A", "B"] }, ["A"]],
		["rating", { maxRating: 5 }, 4],
		["date", {}, "2026-10-29"],
		["file_upload", {}, { attachmentId: "attachment-1" }],
	] as const)("%s accepts a valid answer", (type, config, value) => {
		expect(validateAnswerValue(type, config, value, true)).toEqual({
			valid: true,
		});
	});

	it("rejects missing required answers", () => {
		expect(validateAnswerValue("short_text", {}, "", true)).toEqual({
			valid: false,
			error: "This question is required.",
		});
	});

	it("rejects invalid values for each field family", () => {
		expect(
			validateAnswerValue("short_text", { maxLength: 3 }, "too long", false)
				.valid,
		).toBe(false);
		expect(
			validateAnswerValue("single_choice", { options: ["A"] }, "B", false)
				.valid,
		).toBe(false);
		expect(
			validateAnswerValue(
				"multiple_choice",
				{ options: ["A", "B"], maxSelections: 1 },
				["A", "B"],
				false,
			).valid,
		).toBe(false);
		expect(
			validateAnswerValue("rating", { maxRating: 5 }, 6, false).valid,
		).toBe(false);
		expect(validateAnswerValue("date", {}, "not-a-date", false).valid).toBe(
			false,
		);
		expect(validateAnswerValue("file_upload", {}, 123, false).valid).toBe(
			false,
		);
	});
});
