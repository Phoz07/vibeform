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
