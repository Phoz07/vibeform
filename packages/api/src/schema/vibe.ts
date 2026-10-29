import { z } from "zod";

const HexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const VibeTokensSchema = z.object({
	preset: z.enum(["minimal", "playful", "formal", "cyberpunk", "warm"]),
	primaryColor: z
		.string()
		.regex(HexColorRegex, "Must be a valid hex color code"),
	backgroundColor: z
		.string()
		.regex(HexColorRegex, "Must be a valid hex color code"),
	textColor: z.string().regex(HexColorRegex, "Must be a valid hex color code"),
	borderRadius: z.enum(["none", "sm", "md", "lg", "full"]),
	fontFamily: z.enum(["sans", "serif", "mono", "rounded"]),
});

export type VibeTokens = z.infer<typeof VibeTokensSchema>;

export const PRESET_VIBES: Record<string, VibeTokens> = {
	minimal: {
		preset: "minimal",
		primaryColor: "#18181b",
		backgroundColor: "#ffffff",
		textColor: "#09090b",
		borderRadius: "none",
		fontFamily: "sans",
	},
	playful: {
		preset: "playful",
		primaryColor: "#8b5cf6",
		backgroundColor: "#faf5ff",
		textColor: "#3b0764",
		borderRadius: "lg",
		fontFamily: "rounded",
	},
	formal: {
		preset: "formal",
		primaryColor: "#0f172a",
		backgroundColor: "#f8fafc",
		textColor: "#020617",
		borderRadius: "sm",
		fontFamily: "serif",
	},
	cyberpunk: {
		preset: "cyberpunk",
		primaryColor: "#06b6d4",
		backgroundColor: "#090d16",
		textColor: "#ec4899",
		borderRadius: "none",
		fontFamily: "mono",
	},
	warm: {
		preset: "warm",
		primaryColor: "#ea580c",
		backgroundColor: "#fff7ed",
		textColor: "#431407",
		borderRadius: "md",
		fontFamily: "sans",
	},
};

export const DEFAULT_VIBE = PRESET_VIBES.minimal!;
