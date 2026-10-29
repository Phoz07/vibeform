"use client";

import { Badge } from "@vibeform/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@vibeform/ui/components/card";
import { ExternalLink, FileCode2 } from "lucide-react";
import { useState } from "react";

const adrs = [
	[
		"ADR-0001",
		"Physical Isolation of Control Plane and Data Plane",
		"Definitions and respondent data are physically separated across D1 databases and Worker bindings.",
		"docs/adr/0001-physical-isolation-control-vs-data-plane.md",
		"packages/infra/alchemy.run.ts",
		"Browser → MCP → Definitions D1 | API → Responses D1 / R2",
	],
	[
		"ADR-0002",
		"Human-Only Publish Gate",
		"AI can draft definitions, but only an authenticated human can publish a form.",
		"docs/adr/0002-human-only-publish-gate.md",
		"apps/web/src/app/builder/[id]/builder-client.tsx",
		"AI drafts → human confirmation → published form",
	],
	[
		"ADR-0003",
		"Soft Delete and Immutable Field Types on Live Forms",
		"Live field IDs and types remain stable so decoupled responses cannot be orphaned by edits.",
		"docs/adr/0003-soft-delete-and-immutable-field-types.md",
		"packages/api/src/routers/form.ts",
		"Draft edits → stable field IDs/types → responses remain readable",
	],
	[
		"ADR-0004",
		"Synchronous Cascade Deletion Across Decoupled Databases",
		"Cleanup runs R2, responses D1, then definitions D1 in a strict order.",
		"docs/adr/0004-synchronous-cross-database-deletion.md",
		"packages/api/src/routers/form.ts",
		"R2 objects → Responses D1 → Definitions D1",
	],
	[
		"ADR-0005",
		"Colocation of Authentication Tables in the Definitions Database",
		"Auth and hashed MCP tokens stay in the control-plane database.",
		"docs/adr/0005-auth-colocation-in-definitions-db.md",
		"packages/auth/src/index.ts",
		"Session tables + MCP hashes → Definitions D1",
	],
	[
		"ADR-0006",
		"Whitelisted Design Tokens for Vibe Customization",
		"Vibe styling accepts curated tokens instead of arbitrary CSS or class injection.",
		"docs/adr/0006-whitelisted-design-tokens-for-vibes.md",
		"apps/web/src/components/vibe-provider.tsx",
		"Vibe whitelist → token classes → themed form canvas",
	],
	[
		"ADR-0007",
		"Absolute Zero-Access Data Plane Boundary for V1",
		"MCP has no response or attachment bindings and no tools that relay respondent content.",
		"docs/adr/0007-absolute-zero-access-data-plane.md",
		"apps/mcp/src/index.ts",
		"MCP Worker → hard boundary ✕ → Responses D1 / R2",
	],
] as const;

export function AdrDirectory() {
	const [active, setActive] = useState(0);
	const adr = adrs[active];

	return (
		<Card className="border-border/60 bg-card/70 backdrop-blur">
			<CardHeader className="border-b">
				<CardTitle className="text-base">
					Architecture Decision Records
				</CardTitle>
				<p className="text-muted-foreground text-xs">
					Canonical ADRs from the monorepo with verified implementation
					pointers.
				</p>
			</CardHeader>
			<CardContent className="grid gap-5 p-5 lg:grid-cols-[190px_1fr]">
				<div className="flex gap-2 overflow-x-auto lg:flex-col">
					{adrs.map(([id, title], index) => (
						<button
							key={id}
							type="button"
							onClick={() => setActive(index)}
							className={`shrink-0 rounded-md border px-3 py-2 text-left text-xs transition-colors ${active === index ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"}`}
						>
							<span className="font-mono">{id}</span>
							<span className="ml-2 lg:mt-1 lg:ml-0 lg:block">{title}</span>
						</button>
					))}
				</div>
				<div className="bg-muted/20 rounded-lg border p-5">
					<div className="flex items-center justify-between gap-3">
						<Badge variant="outline">{adr[0]}</Badge>
						<FileCode2 className="text-primary size-5" />
					</div>
					<h3 className="mt-4 text-xl font-semibold">{adr[1]}</h3>
					<p className="text-muted-foreground mt-2 text-sm leading-6">
						{adr[2]}
					</p>
					<div className="border-primary/20 bg-primary/5 mt-4 rounded-md border p-3">
						<p className="text-muted-foreground text-[10px] tracking-wider uppercase">
							Decision flow
						</p>
						<p className="mt-1 font-mono text-xs">{adr[5]}</p>
					</div>
					<div className="mt-5 flex flex-col gap-2 font-mono text-xs">
						<a
							className="text-primary inline-flex items-center gap-2 hover:underline"
							href={`https://github.com/Phoz07/vibeform/blob/main/${adr[3]}`}
							target="_blank"
							rel="noreferrer"
						>
							<ExternalLink className="size-3" /> decision: {adr[3]}
						</a>
						<a
							className="text-primary inline-flex items-center gap-2 hover:underline"
							href={`https://github.com/Phoz07/vibeform/blob/main/${adr[4]}`}
							target="_blank"
							rel="noreferrer"
						>
							<ExternalLink className="size-3" /> code: {adr[4]}
						</a>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
