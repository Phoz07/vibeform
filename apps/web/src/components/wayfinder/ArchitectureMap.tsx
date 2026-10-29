"use client";

import { Badge } from "@vibeform/ui/components/badge";
import { Button } from "@vibeform/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@vibeform/ui/components/card";
import {
	AlertTriangle,
	Bot,
	Database,
	Globe2,
	HardDrive,
	ShieldCheck,
	X,
} from "lucide-react";
import { useState } from "react";

export type FlowMode = "control" | "submission" | "cleanup";

type NodeId = "browser" | "mcp" | "api" | "definitions" | "responses" | "r2";

const nodes: {
	id: NodeId;
	label: string;
	sublabel: string;
	icon: typeof Globe2;
	tone: string;
	bindings: string;
	tools: string;
	security: string;
}[] = [
	{
		id: "browser",
		label: "Browser / Claude",
		sublabel: "Control & response clients",
		icon: Globe2,
		tone: "border-cyan-400/60 text-cyan-300",
		bindings: "HTTPS only",
		tools: "Web UI and MCP client",
		security: "Owner session or public form access",
	},
	{
		id: "mcp",
		label: "MCP Worker",
		sublabel: "Control plane only",
		icon: Bot,
		tone: "border-green-400/70 text-green-300",
		bindings: "DEFINITIONS_DB only",
		tools: "Draft and edit form definitions",
		security: "No responses DB or R2 binding",
	},
	{
		id: "api",
		label: "API Worker",
		sublabel: "Auth + data plane",
		icon: ShieldCheck,
		tone: "border-blue-400/70 text-blue-300",
		bindings: "DEFINITIONS_DB, RESPONSES_DB, ATTACHMENTS_R2",
		tools: "Auth, submissions, uploads, cleanup",
		security: "Authenticated owner routes protect private data",
	},
	{
		id: "definitions",
		label: "Definitions D1",
		sublabel: "Control plane store",
		icon: Database,
		tone: "border-green-400/60 text-green-300",
		bindings: "Bound to control-plane Workers",
		tools: "Form and auth records",
		security: "Separated from respondent data",
	},
	{
		id: "responses",
		label: "Responses D1",
		sublabel: "Private answers",
		icon: Database,
		tone: "border-blue-400/60 text-blue-300",
		bindings: "API Worker only",
		tools: "Private submissions",
		security: "Never bound to MCP Worker",
	},
	{
		id: "r2",
		label: "Attachments R2",
		sublabel: "Private objects",
		icon: HardDrive,
		tone: "border-blue-400/60 text-blue-300",
		bindings: "API Worker only",
		tools: "Private attachment objects",
		security: "Authenticated stream access; never bound to MCP",
	},
];

const positions: Record<NodeId, { x: number; y: number }> = {
	browser: { x: 70, y: 145 },
	mcp: { x: 285, y: 75 },
	api: { x: 285, y: 215 },
	definitions: { x: 390, y: 75 },
	responses: { x: 520, y: 180 },
	r2: { x: 520, y: 285 },
};

const edges: Record<FlowMode, [NodeId, NodeId][]> = {
	control: [
		["browser", "mcp"],
		["mcp", "definitions"],
	],
	submission: [
		["browser", "api"],
		["api", "definitions"],
		["api", "responses"],
		["api", "r2"],
	],
	cleanup: [
		["browser", "api"],
		["api", "r2"],
		["api", "responses"],
		["api", "definitions"],
	],
};

export function ArchitectureMap({
	mode,
	proofMode,
	onModeChange,
}: {
	mode: FlowMode;
	proofMode: boolean;
	onModeChange: (mode: FlowMode) => void;
}) {
	const [selected, setSelected] = useState<NodeId | null>(null);
	const activeEdges = edges[mode];
	const selectedNode = nodes.find((node) => node.id === selected);

	return (
		<Card className="border-green-400/20 bg-zinc-950 text-green-100 shadow-[0_0_40px_rgba(34,197,94,0.08)]">
			<CardHeader className="flex-row items-center justify-between border-b border-green-400/10">
				<div>
					<CardTitle className="font-mono text-green-300">
						ARCHITECTURE / LIVE BOUNDARY
					</CardTitle>
					<p className="mt-1 text-xs text-green-200/60">
						Click a node to inspect its runtime boundary.
					</p>
				</div>
				<Badge variant="outline" className="border-green-400/40 text-green-300">
					<ShieldCheck data-icon="inline-start" /> zero-access proof
				</Badge>
			</CardHeader>
			<CardContent className="p-3 sm:p-6">
				<div className="relative overflow-hidden rounded-xl border border-green-400/15 bg-black/40">
					<svg
						viewBox="0 0 640 360"
						className="w-full min-w-[620px]"
						role="img"
						aria-label="Vibe Form architecture flow map"
					>
						<defs>
							<linearGradient id="flow-green" x1="0%" x2="100%">
								<stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
								<stop offset="50%" stopColor="#86efac" />
								<stop offset="100%" stopColor="#22c55e" stopOpacity="0.2" />
							</linearGradient>
						</defs>
						<rect
							x="430"
							y="12"
							width="192"
							height="336"
							rx="14"
							fill="rgba(30,41,59,0.24)"
							stroke="rgba(96,165,250,0.25)"
							strokeDasharray="5 5"
						/>
						<text
							x="444"
							y="35"
							fill="#93c5fd"
							fontSize="11"
							fontFamily="monospace"
						>
							DATA PLANE
						</text>
						<text
							x="76"
							y="35"
							fill="#86efac"
							fontSize="11"
							fontFamily="monospace"
						>
							CONTROL PLANE
						</text>
						{activeEdges.map(([from, to]) => {
							const a = positions[from];
							const b = positions[to];
							const blocked =
								proofMode &&
								from === "mcp" &&
								(to === "responses" || to === "r2");
							return (
								<g key={`${from}-${to}`}>
									<line
										x1={a.x + 65}
										y1={a.y}
										x2={b.x - 65}
										y2={b.y}
										stroke={blocked ? "#ef4444" : "url(#flow-green)"}
										strokeWidth={blocked ? 3 : 2}
										strokeDasharray={blocked ? "6 6" : undefined}
									/>
									{blocked && (
										<text
											x={(a.x + b.x) / 2}
											y={(a.y + b.y) / 2 - 8}
											fill="#f87171"
											fontSize="10"
											textAnchor="middle"
											fontFamily="monospace"
										>
											BLOCKED
										</text>
									)}
								</g>
							);
						})}
						{proofMode && (
							<g>
								<line
									x1="350"
									y1="75"
									x2="420"
									y2="180"
									stroke="#ef4444"
									strokeWidth="3"
									strokeDasharray="6 6"
								/>
								<text
									x="378"
									y="150"
									fill="#f87171"
									fontSize="10"
									fontFamily="monospace"
								>
									NO BINDING
								</text>
							</g>
						)}
						{nodes.map((node) => {
							const p = positions[node.id];
							const Icon = node.icon;
							const active = node.id === selected;
							return (
								<g key={node.id}>
									<rect
										x={p.x - 65}
										y={p.y - 28}
										width="130"
										height="56"
										rx="10"
										fill={active ? "rgba(34,197,94,0.2)" : "rgba(9,9,11,0.9)"}
										stroke={
											active
												? "#86efac"
												: node.id === "mcp"
													? "#4ade80"
													: "#64748b"
										}
									/>
									<foreignObject
										x={p.x - 54}
										y={p.y - 19}
										width="108"
										height="42"
									>
										<button
											type="button"
											aria-label={`Inspect ${node.label}`}
											onClick={() => setSelected(node.id)}
											className="flex h-full w-full items-center gap-2 bg-transparent text-left font-mono text-[10px] text-green-100"
										>
											<Icon className="size-4 shrink-0" />
											<div>
												<div className="font-semibold">{node.label}</div>
												<div className="opacity-60">{node.sublabel}</div>
											</div>
										</button>
									</foreignObject>
								</g>
							);
						})}
						{proofMode && (
							<g>
								<circle
									cx="350"
									cy="75"
									r="13"
									fill="#7f1d1d"
									stroke="#f87171"
								/>
								<foreignObject x="342" y="67" width="16" height="16">
									<AlertTriangle className="size-4 text-red-200" />
								</foreignObject>
							</g>
						)}
					</svg>
				</div>
				<div className="mt-4 flex flex-wrap gap-2">
					{(["control", "submission", "cleanup"] as FlowMode[]).map((value) => (
						<Button
							key={value}
							size="sm"
							variant={mode === value ? "secondary" : "outline"}
							className="font-mono text-xs"
							onClick={() => onModeChange(value)}
						>
							{value === "control"
								? "01 / CONTROL"
								: value === "submission"
									? "02 / DATA"
									: "03 / CLEANUP"}
						</Button>
					))}
				</div>
				{selectedNode && (
					<div className="mt-4 flex items-start justify-between rounded-lg border border-green-400/20 bg-green-400/5 p-4 font-mono text-xs">
						<div className="flex gap-3">
							<selectedNode.icon className="size-5 text-green-300" />
							<div>
								<p className="text-green-200">{selectedNode.label}</p>
								<p className="mt-1 text-green-100/60">
									{selectedNode.sublabel}
								</p>
								<p className="mt-2 text-green-100/80">
									Bindings: {selectedNode.bindings}
								</p>
								<p className="mt-1 text-green-100/70">
									Tools: {selectedNode.tools}
								</p>
								<p className="mt-1 text-green-100/70">
									Security: {selectedNode.security}
								</p>
							</div>
						</div>
						<Button
							variant="ghost"
							size="icon-xs"
							onClick={() => setSelected(null)}
							aria-label="Close node details"
						>
							<X />
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
