import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import ResponsesPageClient from "./responses-page-client";

export default async function FormResponsesPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const session = await authClient.getSession({
		fetchOptions: { headers: await headers(), throw: true },
	});

	if (!session?.user) redirect("/login");

	return <ResponsesPageClient formId={id} />;
}
