import { z } from "zod";

export const FieldTypeSchema = z.enum([
  "short_text",
  "long_text",
  "single_choice",
  "multiple_choice",
  "rating",
  "date",
  "file_upload",
]);
export type FieldType = z.infer<typeof FieldTypeSchema>;

export const ShortTextConfigSchema = z.object({
  placeholder: z.string().optional(),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(1).optional(),
});
export type ShortTextConfig = z.infer<typeof ShortTextConfigSchema>;

export const LongTextConfigSchema = z.object({
  placeholder: z.string().optional(),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(1).optional(),
});
export type LongTextConfig = z.infer<typeof LongTextConfigSchema>;

export const SingleChoiceConfigSchema = z.object({
  options: z.array(z.string().min(1)).min(1),
  allowOther: z.boolean().optional(),
});
export type SingleChoiceConfig = z.infer<typeof SingleChoiceConfigSchema>;

export const MultipleChoiceConfigSchema = z.object({
  options: z.array(z.string().min(1)).min(1),
  minSelections: z.number().int().min(0).optional(),
  maxSelections: z.number().int().min(1).optional(),
});
export type MultipleChoiceConfig = z.infer<typeof MultipleChoiceConfigSchema>;

export const RatingConfigSchema = z.object({
  maxRating: z.number().int().min(2).max(10).default(5),
  lowLabel: z.string().optional(),
  highLabel: z.string().optional(),
});
export type RatingConfig = z.infer<typeof RatingConfigSchema>;

export const DateConfigSchema = z.object({
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
});
export type DateConfig = z.infer<typeof DateConfigSchema>;

export const FileUploadConfigSchema = z.object({
  maxSizeBytes: z.number().int().min(1024).max(50 * 1024 * 1024).default(10 * 1024 * 1024),
  allowedMimeTypes: z.array(z.string()).default([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]),
});
export type FileUploadConfig = z.infer<typeof FileUploadConfigSchema>;

export const FieldConfigSchema = z.union([
  ShortTextConfigSchema,
  LongTextConfigSchema,
  SingleChoiceConfigSchema,
  MultipleChoiceConfigSchema,
  RatingConfigSchema,
  DateConfigSchema,
  FileUploadConfigSchema,
]);

export function validateFieldConfig(type: FieldType, config: unknown) {
  switch (type) {
    case "short_text":
      return ShortTextConfigSchema.parse(config ?? {});
    case "long_text":
      return LongTextConfigSchema.parse(config ?? {});
    case "single_choice":
      return SingleChoiceConfigSchema.parse(config ?? { options: ["Option 1"] });
    case "multiple_choice":
      return MultipleChoiceConfigSchema.parse(config ?? { options: ["Option 1"] });
    case "rating":
      return RatingConfigSchema.parse(config ?? { maxRating: 5 });
    case "date":
      return DateConfigSchema.parse(config ?? {});
    case "file_upload":
      return FileUploadConfigSchema.parse(config ?? {});
  }
}

export function validateAnswerValue(
  type: FieldType,
  configRaw: unknown,
  value: unknown,
  required: boolean,
): { valid: boolean; error?: string } {
  // Empty check
  const isEmpty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  if (required && isEmpty) {
    return { valid: false, error: "This question is required." };
  }

  if (isEmpty) {
    return { valid: true };
  }

  const config = validateFieldConfig(type, configRaw);

  switch (type) {
    case "short_text":
    case "long_text": {
      if (typeof value !== "string") {
        return { valid: false, error: "Must be text." };
      }
      const c = config as ShortTextConfig;
      if (c.minLength !== undefined && value.length < c.minLength) {
        return { valid: false, error: `Must be at least ${c.minLength} characters.` };
      }
      if (c.maxLength !== undefined && value.length > c.maxLength) {
        return { valid: false, error: `Must be no more than ${c.maxLength} characters.` };
      }
      return { valid: true };
    }

    case "single_choice": {
      if (typeof value !== "string") {
        return { valid: false, error: "Must select a valid option." };
      }
      const c = config as SingleChoiceConfig;
      if (!c.allowOther && !c.options.includes(value)) {
        return { valid: false, error: "Selected option is not in the allowed choices." };
      }
      return { valid: true };
    }

    case "multiple_choice": {
      if (!Array.isArray(value)) {
        return { valid: false, error: "Must be a list of selections." };
      }
      const c = config as MultipleChoiceConfig;
      if (value.some((item) => typeof item !== "string")) {
        return { valid: false, error: "Selections must be text values." };
      }
      if (new Set(value).size !== value.length) {
        return { valid: false, error: "Selections must be unique." };
      }
      if (c.minSelections !== undefined && value.length < c.minSelections) {
        return { valid: false, error: `Select at least ${c.minSelections} options.` };
      }
      if (c.maxSelections !== undefined && value.length > c.maxSelections) {
        return { valid: false, error: `Select at most ${c.maxSelections} options.` };
      }
      for (const item of value) {
        if (!c.options.includes(String(item))) {
          return { valid: false, error: `Invalid choice: ${item}` };
        }
      }
      return { valid: true };
    }

    case "rating": {
      const num = Number(value);
      const c = config as RatingConfig;
      if (isNaN(num) || !Number.isInteger(num) || num < 1 || num > (c.maxRating || 5)) {
        return { valid: false, error: `Rating must be between 1 and ${c.maxRating || 5}.` };
      }
      return { valid: true };
    }

    case "date": {
      if (typeof value !== "string" || isNaN(Date.parse(value))) {
        return { valid: false, error: "Must be a valid date format." };
      }
      const c = config as DateConfig;
      if (c.minDate && value < c.minDate) {
        return { valid: false, error: `Date must be on or after ${c.minDate}.` };
      }
      if (c.maxDate && value > c.maxDate) {
        return { valid: false, error: `Date must be on or before ${c.maxDate}.` };
      }
      return { valid: true };
    }

    case "file_upload": {
      if (typeof value !== "string" && (typeof value !== "object" || !value)) {
        return { valid: false, error: "Must provide a valid uploaded attachment reference." };
      }
      return { valid: true };
    }
  }
}
