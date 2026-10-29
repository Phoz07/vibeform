"use client";

import type { VibeTokens } from "@vibeform/api";
import { createContext, useContext, type ReactNode } from "react";

export const vibePresets = {
	minimal: "bg-slate-50 text-slate-900 border-slate-200 font-sans rounded-lg",
	playful:
		"bg-amber-50 text-amber-950 border-amber-300 font-soft rounded-3xl shadow-sm",
	cyberpunk:
		"bg-zinc-950 text-green-400 border-green-500 font-mono shadow-[0_0_15px_rgba(34,197,94,0.2)] rounded-none",
	formal: "bg-white text-zinc-800 border-zinc-300 font-serif rounded-md",
	warm: "bg-stone-100 text-stone-800 border-stone-300 font-sans rounded-xl",
} as const;

const VibeContext = createContext<keyof typeof vibePresets>("minimal");

export function VibeProvider({
	vibe,
	children,
}: {
	vibe?: Pick<VibeTokens, "preset"> | string;
	children: ReactNode;
}) {
	const preset = typeof vibe === "string" ? vibe : vibe?.preset;
	const safePreset =
		preset && preset in vibePresets
			? (preset as keyof typeof vibePresets)
			: "minimal";

	return (
		<VibeContext.Provider value={safePreset}>
			<div className={vibePresets[safePreset]} data-vibe={safePreset}>
				{children}
			</div>
		</VibeContext.Provider>
	);
}

export function useVibePreset() {
	return useContext(VibeContext);
}
