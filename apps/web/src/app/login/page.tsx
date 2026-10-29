"use client";

import { Button } from "@vibeform/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@vibeform/ui/components/card";
import { Input } from "@vibeform/ui/components/input";
import { Label } from "@vibeform/ui/components/label";
import {
	Code2,
	Globe2,
	Loader2,
	LockKeyhole,
	Mail,
	ShieldCheck,
	Sparkles,
	Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

const highlights = [
	{
		icon: ShieldCheck,
		title: "Physical Boundary Isolation",
		description: "AI Worker has zero access to the responses database.",
	},
	{
		icon: Zap,
		title: "Edge Native",
		description: "Built on Cloudflare Workers, D1, and private R2 storage.",
	},
	{
		icon: Sparkles,
		title: "MCP Native",
		description: "Control form definitions from Claude Desktop, never answers.",
	},
];

export default function LoginPage() {
	const router = useRouter();
	const [isSignUp, setIsSignUp] = useState(false);
	const [isPending, setIsPending] = useState(false);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsPending(true);
		try {
			const result = isSignUp
				? await authClient.signUp.email({ name, email, password })
				: await authClient.signIn.email({ email, password });
			if (result.error) {
				toast.error(result.error.message || "Authentication failed");
				return;
			}
			toast.success(isSignUp ? "Account created" : "Welcome back");
			router.push("/dashboard");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Authentication failed",
			);
		} finally {
			setIsPending(false);
		}
	};

	const handleSocialAuth = async (provider: "github" | "google") => {
		setIsPending(true);
		try {
			const result = await authClient.signIn.social({
				provider,
				callbackURL: "/dashboard",
			});
			if (result.error)
				toast.error(result.error.message || `${provider} sign-in failed`);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: `${provider} sign-in is unavailable`,
			);
		} finally {
			setIsPending(false);
		}
	};

	const handleMagicLink = () => {
		toast.error(
			"Magic links are not configured yet. Use email and password or connect an email provider.",
		);
	};

	return (
		<main className="bg-background relative min-h-[calc(100vh-4rem)] overflow-hidden">
			<div className="bg-primary/10 pointer-events-none absolute top-12 -left-32 size-80 rounded-full blur-3xl" />
			<div className="bg-chart-2/10 pointer-events-none absolute -right-32 bottom-0 size-96 rounded-full blur-3xl" />
			<div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
				<section className="flex flex-col gap-8">
					<div className="text-primary flex items-center gap-2 text-sm font-semibold tracking-[0.18em] uppercase">
						<Sparkles data-icon="inline-start" />
						Vibe Form
					</div>
					<div className="flex flex-col gap-5">
						<h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">
							Describe the vibe.
							<span className="text-primary block">Get the form.</span>
						</h1>
						<p className="text-muted-foreground max-w-lg text-lg leading-8">
							AI builds it, but never reads the answers. A private, edge-native
							form studio for thoughtful data collection.
						</p>
					</div>
					<div className="grid gap-3 sm:grid-cols-3 lg:max-w-2xl lg:grid-cols-1">
						{highlights.map(({ icon: Icon, title, description }) => (
							<div
								key={title}
								className="bg-card/60 flex gap-3 rounded-xl border p-4 backdrop-blur transition-transform hover:-translate-y-0.5"
							>
								<div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
									<Icon />
								</div>
								<div className="flex flex-col gap-1">
									<h2 className="text-sm font-semibold">{title}</h2>
									<p className="text-muted-foreground text-xs leading-5">
										{description}
									</p>
								</div>
							</div>
						))}
					</div>
				</section>

				<Card className="border-border/60 bg-card/70 shadow-primary/5 shadow-2xl backdrop-blur-xl">
					<CardHeader className="gap-2">
						<div className="bg-primary text-primary-foreground shadow-primary/20 mb-2 flex size-11 items-center justify-center rounded-xl shadow-lg">
							<LockKeyhole />
						</div>
						<CardTitle className="text-2xl">
							{isSignUp ? "Create your workspace" : "Welcome back"}
						</CardTitle>
						<CardDescription>
							{isSignUp
								? "Start building private, beautiful forms."
								: "Sign in to your secure form studio."}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-5">
						<div className="grid grid-cols-2 gap-2">
							<Button
								variant="outline"
								type="button"
								disabled={isPending}
								onClick={() => handleSocialAuth("github")}
							>
								<Code2 data-icon="inline-start" /> GitHub
							</Button>
							<Button
								variant="outline"
								type="button"
								disabled={isPending}
								onClick={() => handleSocialAuth("google")}
							>
								<Globe2 data-icon="inline-start" /> Google
							</Button>
						</div>
						<div className="text-muted-foreground flex items-center gap-3 text-xs">
							<div className="bg-border h-px flex-1" />
							<span>or continue with email</span>
							<div className="bg-border h-px flex-1" />
						</div>
						<form className="flex flex-col gap-4" onSubmit={handleEmailAuth}>
							{isSignUp && (
								<div className="flex flex-col gap-2">
									<Label htmlFor="name">Name</Label>
									<Input
										id="name"
										value={name}
										onChange={(event) => setName(event.target.value)}
										required
										minLength={2}
									/>
								</div>
							)}
							<div className="flex flex-col gap-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									required
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="password">Password</Label>
								<Input
									id="password"
									type="password"
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									required
									minLength={8}
								/>
							</div>
							<Button type="submit" disabled={isPending}>
								{isPending && (
									<Loader2 className="animate-spin" data-icon="inline-start" />
								)}
								{isSignUp ? "Create account" : "Sign in"}
							</Button>
						</form>
						<Button
							variant="ghost"
							type="button"
							disabled={isPending}
							onClick={handleMagicLink}
						>
							<Mail data-icon="inline-start" /> Send me a magic link
						</Button>
						<p className="text-muted-foreground text-center text-sm">
							{isSignUp ? "Already have an account?" : "New to Vibe Form?"}{" "}
							<button
								type="button"
								className="text-primary font-medium hover:underline"
								onClick={() => setIsSignUp((value) => !value)}
							>
								{isSignUp ? "Sign in" : "Create an account"}
							</button>
						</p>
						<div className="text-muted-foreground flex items-center justify-center gap-2 text-xs">
							<span className="size-2 rounded-full bg-emerald-500" />
							System Operational · Cloudflare Live
						</div>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
