"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";

import Dashboard from "./dashboard";

export default function DashboardPage() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();

	useEffect(() => {
		if (!isPending && !session?.user) {
			router.replace("/login");
		}
	}, [isPending, router, session?.user]);

	if (isPending || !session?.user) {
		return <Loader />;
	}

	return (
		<div>
			<h1>Dashboard</h1>
			<p>Welcome {session.user.name}</p>
			<Dashboard session={session} />
		</div>
	);
}
