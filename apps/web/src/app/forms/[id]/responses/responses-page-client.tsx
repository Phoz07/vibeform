"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/utils/trpc";
import { Button } from "@vibeform/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@vibeform/ui/components/card";
import { toast } from "sonner";

export default function ResponsesPageClient({ formId }: { formId: string }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const responsesQuery = useQuery(trpc.form.responses.queryOptions({ formId }));
	const deleteResponse = useMutation(
		trpc.form.deleteResponse.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries(
					trpc.form.responses.queryFilter({ formId }),
				);
				toast.success("Response deleted");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<main className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Responses</h1>
					<p className="text-sm text-muted-foreground">
						🔒 Private owner view · physical data-plane isolation active
					</p>
				</div>
				<Button variant="outline" onClick={() => history.back()}>
					Back
				</Button>
			</div>
			<Card>
				<CardHeader>
					<CardTitle>Submissions</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{responsesQuery.isLoading && <p>Loading responses...</p>}
					{responsesQuery.data?.length === 0 && (
						<p className="text-sm text-muted-foreground">No responses yet.</p>
					)}
					{responsesQuery.data?.map((response) => (
						<article key={response.id} className="rounded-md border p-4">
							<div className="mb-3 flex items-center justify-between">
								<time className="text-xs text-muted-foreground">
									{new Date(response.submittedAt).toLocaleString()}
								</time>
								<Button
									size="sm"
									variant="destructive"
									onClick={() => {
										if (window.confirm("Delete this response permanently?")) {
											deleteResponse.mutate({
												formId,
												responseId: response.id,
											});
										}
									}}
								>
									Delete response
								</Button>
							</div>
							<div className="space-y-2 text-sm">
								{response.answers.map((answer) => (
									<div key={answer.id}>
										<strong>{answer.label}</strong>
										<p className="whitespace-pre-wrap text-muted-foreground">
											{typeof answer.value === "string"
												? answer.value
												: JSON.stringify(answer.value)}
											{answer.attachment && (
												<a
													className="ml-2 underline"
													href={`${process.env.NEXT_PUBLIC_SERVER_URL}/attachments/${answer.attachment.id}`}
													target="_blank"
													rel="noreferrer"
												>
													Download {answer.attachment.fileName}
												</a>
											)}
										</p>
									</div>
								))}
							</div>
						</article>
					))}
				</CardContent>
			</Card>
		</main>
	);
}
