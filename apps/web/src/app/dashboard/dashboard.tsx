"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/utils/trpc";
import { Button, buttonVariants } from "@vibeform/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@vibeform/ui/components/card";
import { Input } from "@vibeform/ui/components/input";
import { Label } from "@vibeform/ui/components/label";

export default function Dashboard({
  session,
}: {
  session: typeof authClient.$Infer.Session;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const formsQuery = useQuery(trpc.form.list.queryOptions());

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createFormMutation = useMutation(
    trpc.form.create.mutationOptions({
      onSuccess: (newForm) => {
        toast.success("Form created successfully!");
        setTitle("");
        setDescription("");
        setIsCreating(false);
        queryClient.invalidateQueries(trpc.form.list.queryFilter());
      },
      onError: (err) => {
        toast.error(err.message || "Failed to create form");
      },
    }),
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createFormMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Forms</h1>
          <p className="text-muted-foreground mt-1">
            Manage your AI-crafted forms and monitor responses securely.
          </p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? "Cancel" : "+ New Form"}
        </Button>
      </div>

      {isCreating && (
        <Card className="border-primary/40 bg-accent/20">
          <CardHeader>
            <CardTitle>Create a New Form</CardTitle>
            <CardDescription>
              Start with a title and description. You can add questions manually or ask your AI via MCP.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreate}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="form-title">Form Title</Label>
                <Input
                  id="form-title"
                  placeholder="e.g. Summer Camp Registration 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-desc">Description (Optional)</Label>
                <Input
                  id="form-desc"
                  placeholder="e.g. Please fill out details and dietary requirements."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createFormMutation.isPending}>
                {createFormMutation.isPending ? "Creating..." : "Create Form Draft"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {formsQuery.isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading your forms...</div>
      ) : formsQuery.data && formsQuery.data.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {formsQuery.data.map((form) => (
            <Card key={form.id} className="flex flex-col justify-between hover:shadow-md transition">
              <CardHeader>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      form.status === "published"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : form.status === "closed"
                          ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {form.status}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    /f/{form.slug}
                  </span>
                </div>
                <CardTitle className="line-clamp-1">{form.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {form.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex items-center justify-between pt-4 border-t gap-2">
                <Link
                  href={`/builder/${form.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm", className: "w-full text-center" })}
                >
                  Open Builder
                </Link>
                {form.status === "published" && (
                  <Link
                    href={`/f/${form.slug}`}
                    target="_blank"
                    className={buttonVariants({ variant: "secondary", size: "sm", className: "w-full text-center" })}
                  >
                    View Live ↗
                  </Link>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-12 text-center">
          <CardContent className="space-y-4">
            <h3 className="text-lg font-medium">No forms yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Create your first form using the button above or tell Claude via MCP to generate one for you.
            </p>
            <Button onClick={() => setIsCreating(true)}>Create Your First Form</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
