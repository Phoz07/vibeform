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
	ArrowRight,
	CheckCircle2,
	LockKeyhole,
	Play,
	RotateCcw,
} from "lucide-react";
import { useState } from "react";

import type { FlowMode } from "./ArchitectureMap";

export function DataFlowSimulator({
	mode,
	proofMode,
	onProofModeChange,
}: {
	mode: FlowMode;
	proofMode: boolean;
	onProofModeChange: (enabled: boolean) => void;
}) {
	const [running, setRunning] = useState(false);
	const [complete, setComplete] = useState(false);
	const labels =
		mode === "control"
			? ["Browser / Claude", "MCP Worker", "Definitions D1"]
			: mode === "submission"
				? ["Respondent", "API Worker", "Responses D1 + R2"]
				: ["Owner", "R2 cleanup", "Responses D1", "Definitions D1"];

	const run = () => {
		setRunning(true);
		setComplete(false);
		window.setTimeout(() => {
			setRunning(false);
			setComplete(true);
		}, 900);
	};

	return (
		<Card className="border-border/60 bg-card/70 backdrop-blur">
			<CardHeader className="flex-row items-center justify-between border-b">
				<div>
					<CardTitle className="flex items-center gap-2 text-base">
						<Play className="text-primary" /> Flow simulator
					</CardTitle>
					<p className="text-muted-foreground mt-1 text-xs">
						A visual explanation, not a live data-plane request.
					</p>
				</div>
				<Button size="sm" variant="outline" onClick={run} disabled={running}>
					<RotateCcw data-icon="inline-start" />{" "}
					{running ? "Tracing..." : "Replay flow"}
				</Button>
			</CardHeader>
			<CardContent className="flex flex-col gap-5 p-5">
				<div className="flex flex-wrap items-center gap-2">
					{labels.map((label, index) => (
						<div key={label} className="flex items-center gap-2">
							{index > 0 && (
								<ArrowRight className="text-muted-foreground size-4" />
							)}
							<Badge
								variant={complete ? "secondary" : "outline"}
								className="px-3 py-1"
							>
								{complete && <CheckCircle2 data-icon="inline-start" />}
								{label}
							</Badge>
						</div>
					))}
				</div>
				<button
					type="button"
					onClick={() => onProofModeChange(!proofMode)}
					className={`flex items-center justify-between rounded-lg border p-4 text-left transition-colors ${proofMode ? "border-red-400/50 bg-red-500/10" : "border-green-400/30 bg-green-500/5"}`}
				>
					<div className="flex gap-3">
						<div
							className={`flex size-9 items-center justify-center rounded-full ${proofMode ? "bg-red-500/20 text-red-300" : "bg-green-500/20 text-green-300"}`}
						>
							{proofMode ? <AlertTriangle /> : <LockKeyhole />}
						</div>
						<div>
							<p className="text-sm font-semibold">
								{proofMode
									? "Simulated prompt injection: contained"
									: "Physical isolation proof mode"}
							</p>
							<p className="text-muted-foreground mt-1 text-xs">
								{proofMode
									? "The MCP Worker has no binding edge to Responses D1 or Attachments R2."
									: "Toggle to visualize a request stopped at the Worker binding boundary."}
							</p>
						</div>
					</div>
					<Badge variant={proofMode ? "destructive" : "secondary"}>
						{proofMode ? "BLOCKED" : "OFF"}
					</Badge>
				</button>
			</CardContent>
		</Card>
	);
}
