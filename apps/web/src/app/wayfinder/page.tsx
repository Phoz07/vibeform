"use client";

import { Badge } from "@vibeform/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@vibeform/ui/components/card";
import {
	Activity,
	CheckCircle2,
	Cloud,
	Code2,
	Cpu,
	Database,
	ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AdrDirectory } from "@/components/wayfinder/AdrDirectory";
import {
	ArchitectureMap,
	type FlowMode,
} from "@/components/wayfinder/ArchitectureMap";
import { DataFlowSimulator } from "@/components/wayfinder/DataFlowSimulator";

const production = {
	web: "https://vibeform-web-live-phos-yzh42clevvg333kg.maverxk07.workers.dev",
	api: "https://vibeform-server-live-phos-tmyaurd6zryrq42j.maverxk07.workers.dev",
	mcp: "https://vibeform-mcp-live-phos-sqbni43fskbd5blh.maverxk07.workers.dev",
};

const nodes = [
	["Web UI", production.web, "web", Cloud],
	["API Worker", production.api, "api", Cpu],
	["MCP Control", production.mcp, "mcp", ShieldCheck],
] as const;

export default function WayfinderPage() {
	const [mode, setMode] = useState<FlowMode>("control");
	const [proofMode, setProofMode] = useState(false);
	const [health, setHealth] = useState<
		Record<string, { ok: boolean; latency: number }>
	>({});
	const endpoints = useMemo(() => ({ web: "/", api: "/", mcp: "/health" }), []);

	useEffect(() => {
		let cancelled = false;
		const check = async () => {
			const results = await Promise.all(
				nodes.map(async ([, url, key]) => {
					const started = performance.now();
					const controller = new AbortController();
					const timeout = window.setTimeout(() => controller.abort(), 5000);
					try {
						const response = await fetch(`${url}${endpoints[key]}`, {
							cache: "no-store",
							signal: controller.signal,
						});
						return [
							key,
							{
								ok: response.ok,
								latency: Math.round(performance.now() - started),
							},
						] as const;
					} catch {
						return [
							key,
							{ ok: false, latency: Math.round(performance.now() - started) },
						] as const;
					} finally {
						window.clearTimeout(timeout);
					}
				}),
			);
			if (!cancelled) setHealth(Object.fromEntries(results));
		};
		check();
		const interval = window.setInterval(check, 30000);
		return () => {
			cancelled = true;
			window.clearInterval(interval);
		};
	}, [endpoints]);

	return (
		<main className="min-h-screen bg-zinc-950 text-zinc-100">
			<div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
				<header className="flex flex-col gap-5 border-b border-green-400/15 pb-6 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<div className="flex items-center gap-2 font-mono text-sm tracking-[0.2em] text-green-300 uppercase">
							<Activity className="size-4" /> Vibe Form / Wayfinder
						</div>
						<h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
							Production architecture,{" "}
							<span className="text-green-300">made visible.</span>
						</h1>
						<p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
							Trace the Control Plane, Data Plane, and the physical boundary
							that keeps respondent answers away from AI tooling.
						</p>
					</div>{" "}
					<a
						href="https://github.com/Phoz07/vibeform"
						target="_blank"
						rel="noreferrer"
						className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
					>
						<Code2 className="size-4" /> source on GitHub
					</a>
				</header>
				<section className="grid gap-3 sm:grid-cols-3">
					{nodes.map(([label, url, key, Icon]) => {
						const result = health[key];
						return (
							<Card key={key} className="border-green-400/15 bg-zinc-900/70">
								<CardContent className="flex items-center justify-between p-4">
									<div className="flex items-center gap-3">
										<Icon className="size-5 text-green-300" />
										<div>
											<p className="text-sm font-medium">{label}</p>
											<p className="max-w-[180px] truncate font-mono text-[10px] text-zinc-500">
												{url.replace("https://", "")}
											</p>
										</div>
									</div>
									<Badge
										variant="outline"
										className={
											result?.ok
												? "border-green-400/40 text-green-300"
												: "border-zinc-600 text-zinc-400"
										}
									>
										{result ? (
											result.ok ? (
												<>
													<CheckCircle2 data-icon="inline-start" />{" "}
													{result.latency}ms
												</>
											) : (
												"offline"
											)
										) : (
											"checking"
										)}
									</Badge>
								</CardContent>
							</Card>
						);
					})}
				</section>
				<section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
					<ArchitectureMap
						mode={mode}
						proofMode={proofMode}
						onModeChange={setMode}
					/>
					<DataFlowSimulator
						mode={mode}
						proofMode={proofMode}
						onProofModeChange={setProofMode}
					/>
				</section>
				<section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
					<Card className="border-blue-400/15 bg-zinc-900/70">
						<CardHeader className="border-b border-blue-400/10">
							<CardTitle className="flex items-center gap-2 text-base">
								<Database className="text-blue-300" /> Isolation contract
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4 p-5 text-sm text-zinc-300">
							<p>
								<span className="font-mono text-green-300">MCP Worker</span> can
								read and write form definitions only.
							</p>
							<p>
								<span className="font-mono text-blue-300">API Worker</span> owns
								authenticated responses and private attachments.
							</p>
							<div className="rounded-lg border border-red-400/20 bg-red-500/5 p-3 font-mono text-xs text-red-200">
								No MCP binding → Responses D1
								<br />
								No MCP binding → Attachments R2
							</div>
						</CardContent>
					</Card>
					<AdrDirectory />
				</section>
			</div>
		</main>
	);
}
