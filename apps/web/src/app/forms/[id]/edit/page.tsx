import { redirect } from "next/navigation";

export default async function FormEditPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	redirect(`/builder/${id}`);
}
