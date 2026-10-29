"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/utils/trpc";
import { DEFAULT_VIBE, type FieldType, PRESET_VIBES, type VibeTokens } from "@vibeform/api";
import { Button, buttonVariants } from "@vibeform/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibeform/ui/components/card";
import { Checkbox } from "@vibeform/ui/components/checkbox";
import { Input } from "@vibeform/ui/components/input";
import { Label } from "@vibeform/ui/components/label";
import { Textarea } from "@vibeform/ui/components/textarea";

const FIELD_TYPES: { type: FieldType; label: string; icon: string }[] = [
  { type: "short_text", label: "Short Text", icon: "📝" },
  { type: "long_text", label: "Long Text", icon: "📄" },
  { type: "single_choice", label: "Single Choice", icon: "🔘" },
  { type: "multiple_choice", label: "Multiple Choice", icon: "☑️" },
  { type: "rating", label: "Rating", icon: "⭐" },
  { type: "date", label: "Date", icon: "📅" },
  { type: "file_upload", label: "File Upload", icon: "📎" },
];

export default function BuilderClient({
  formId,
  session,
}: {
  formId: string;
  session: typeof authClient.$Infer.Session;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const formQuery = useQuery(trpc.form.get.queryOptions({ id: formId }));

  const [activeTab, setActiveTab] = useState<"builder" | "preview">("builder");
  const [newFieldType, setNewFieldType] = useState<FieldType>("short_text");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [isAddingField, setIsAddingField] = useState(false);
  const [slug, setSlug] = useState("");

  const form = formQuery.data;

  useEffect(() => {
    if (form?.slug) setSlug(form.slug);
  }, [form?.slug]);

  const currentVibe: VibeTokens = form?.vibeTokens
    ? typeof form.vibeTokens === "string"
      ? JSON.parse(form.vibeTokens)
      : (form.vibeTokens as VibeTokens)
    : DEFAULT_VIBE;

  const setVibeMutation = useMutation(
    trpc.form.setVibe.mutationOptions({
      onSuccess: () => {
        toast.success("Vibe updated!");
        queryClient.invalidateQueries(trpc.form.get.queryFilter({ id: formId }));
      },
      onError: (err) => toast.error(err.message || "Failed to update vibe"),
    }),
  );

  const statusMutation = useMutation(
    trpc.form.setStatus.mutationOptions({
      onSuccess: (updated) => {
        toast.success(updated.status === "published" ? "Form published!" : `Form marked ${updated.status}.`);
        queryClient.invalidateQueries(trpc.form.get.queryFilter({ id: formId }));
        queryClient.invalidateQueries(trpc.form.list.queryFilter());
      },
      onError: (err) => toast.error(err.message || "Failed to update form status"),
    }),
  );

  const updateFormMutation = useMutation(
    trpc.form.update.mutationOptions({
      onSuccess: () => {
        toast.success("Form details updated!");
        queryClient.invalidateQueries(trpc.form.get.queryFilter({ id: formId }));
        queryClient.invalidateQueries(trpc.form.list.queryFilter());
      },
      onError: (err) => toast.error(err.message || "Failed to update form details"),
    }),
  );

  const addFieldMutation = useMutation(
    trpc.form.addField.mutationOptions({
      onSuccess: () => {
        toast.success("Question added!");
        setNewFieldLabel("");
        setIsAddingField(false);
        queryClient.invalidateQueries(trpc.form.get.queryFilter({ id: formId }));
      },
      onError: (err) => toast.error(err.message || "Failed to add field"),
    }),
  );

  const removeFieldMutation = useMutation(
    trpc.form.removeField.mutationOptions({
      onSuccess: () => {
        toast.success("Question deleted");
        queryClient.invalidateQueries(trpc.form.get.queryFilter({ id: formId }));
      },
      onError: (err) => toast.error(err.message || "Failed to remove field"),
    }),
  );

  const reorderFieldsMutation = useMutation(
    trpc.form.reorderFields.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.form.get.queryFilter({ id: formId }));
      },
    }),
  );

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabel.trim()) return;

    let defaultConfig: Record<string, unknown> = {};
    if (newFieldType === "single_choice" || newFieldType === "multiple_choice") {
      defaultConfig = { options: ["Option 1", "Option 2", "Option 3"] };
    } else if (newFieldType === "rating") {
      defaultConfig = { maxRating: 5, lowLabel: "Poor", highLabel: "Excellent" };
    } else if (newFieldType === "file_upload") {
      defaultConfig = {
        maxSizeBytes: 10 * 1024 * 1024,
        allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
      };
    }

    addFieldMutation.mutate({
      formId,
      type: newFieldType,
      label: newFieldLabel.trim(),
      required: newFieldRequired,
      config: defaultConfig,
    });
  };

  const moveField = (index: number, direction: "up" | "down") => {
    if (!form?.fields) return;
    const newFields = [...form.fields];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;

    const [moved] = newFields.splice(index, 1);
    newFields.splice(targetIndex, 0, moved);

    reorderFieldsMutation.mutate({
      formId,
      fieldIds: newFields.map((f) => f.id),
    });
  };

  if (formQuery.isLoading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-16 text-center text-muted-foreground">
        Loading form builder...
      </div>
    );
  }

  if (formQuery.isError || !form) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-semibold text-destructive">Form not found or access denied</h2>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-xs text-muted-foreground hover:underline"
            >
              ← Back to Dashboard
            </Link>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                form.status === "published"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
              }`}
            >
              {form.status}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{form.title}</h1>
          {form.description && (
            <p className="text-sm text-muted-foreground">{form.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-muted p-1 rounded-lg flex gap-1">
            <Button
              size="sm"
              variant={activeTab === "builder" ? "default" : "ghost"}
              onClick={() => setActiveTab("builder")}
            >
              Builder
            </Button>
            <Button
              size="sm"
              variant={activeTab === "preview" ? "default" : "ghost"}
              onClick={() => setActiveTab("preview")}
            >
              Live Preview
            </Button>
          </div>
          {form.status === "published" && (
            <Link
              href={`/f/${form.slug}`}
              target="_blank"
              className={buttonVariants({ size: "sm", variant: "secondary" })}
            >
              Public Link ↗
            </Link>
          )}
          {form.status === "draft" && (
            <Button
              size="sm"
              onClick={() => statusMutation.mutate({ id: formId, status: "published" })}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? "Publishing..." : "Publish"}
            </Button>
          )}
          {form.status === "published" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => statusMutation.mutate({ id: formId, status: "closed" })}
              disabled={statusMutation.isPending}
            >
              Close form
            </Button>
          )}
          {form.status === "closed" && (
            <Button
              size="sm"
              onClick={() => statusMutation.mutate({ id: formId, status: "published" })}
              disabled={statusMutation.isPending}
            >
              Reopen form
            </Button>
          )}
        </div>
      </div>

      {/* Main Workspace */}
      {activeTab === "builder" ? (
        <div className="grid md:grid-cols-3 gap-8">
          {/* Questions List (Left 2 cols) */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Form Questions ({form.fields.length})
              </h2>
              <Button size="sm" onClick={() => setIsAddingField(!isAddingField)}>
                {isAddingField ? "Cancel" : "+ Add Question"}
              </Button>
            </div>

            {isAddingField && (
              <Card className="border-primary/50 shadow-sm bg-accent/10">
                <CardHeader>
                  <CardTitle className="text-base">Add New Question</CardTitle>
                </CardHeader>
                <form onSubmit={handleAddField}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Question Type</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {FIELD_TYPES.map((ft) => (
                          <button
                            key={ft.type}
                            type="button"
                            onClick={() => setNewFieldType(ft.type)}
                            className={`p-2 rounded-md border text-left text-xs font-medium flex items-center gap-1.5 transition ${
                              newFieldType === ft.type
                                ? "border-primary bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            }`}
                          >
                            <span>{ft.icon}</span>
                            <span>{ft.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="question-label">Question Text</Label>
                      <Input
                        id="question-label"
                        placeholder="e.g. What is your full name?"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="question-required"
                        checked={newFieldRequired}
                        onCheckedChange={(checked) => setNewFieldRequired(!!checked)}
                      />
                      <Label htmlFor="question-required" className="text-sm cursor-pointer">
                        Mark as Required
                      </Label>
                    </div>
                  </CardContent>
                  <div className="flex justify-end gap-2 p-4 pt-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddingField(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={addFieldMutation.isPending}
                    >
                      {addFieldMutation.isPending ? "Adding..." : "Add to Form"}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {form.fields.length === 0 ? (
              <Card className="py-12 text-center">
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground text-sm">
                    No questions in this form yet.
                  </p>
                  <Button size="sm" onClick={() => setIsAddingField(true)}>
                    Add Your First Question
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {form.fields.map((field, idx) => {
                  const typeMeta = FIELD_TYPES.find((t) => t.type === field.type);
                  const config =
                    typeof field.config === "string"
                      ? JSON.parse(field.config)
                      : (field.config as Record<string, any> | null) || {};

                  return (
                    <Card key={field.id} className="p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            #{idx + 1}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-muted font-medium">
                            {typeMeta?.icon} {typeMeta?.label || field.type}
                          </span>
                          {field.required && (
                            <span className="text-xs text-destructive font-semibold">
                              *Required
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-base pt-1">{field.label}</h4>

                        {/* Options preview for choice fields */}
                        {(field.type === "single_choice" ||
                          field.type === "multiple_choice") &&
                          Array.isArray(config.options) && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {config.options.map((opt: string, i: number) => (
                                <span
                                  key={i}
                                  className="text-xs border rounded px-2 py-0.5 bg-background text-muted-foreground"
                                >
                                  {opt}
                                </span>
                              ))}
                            </div>
                          )}

                        {field.type === "rating" && (
                          <p className="text-xs text-muted-foreground pt-1">
                            Scale: 1 to {config.maxRating || 5} (
                            {config.lowLabel || "Low"} → {config.highLabel || "High"})
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={idx === 0}
                          onClick={() => moveField(idx, "up")}
                          title="Move Up"
                        >
                          ▲
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={idx === form.fields.length - 1}
                          onClick={() => moveField(idx, "down")}
                          title="Move Down"
                        >
                          ▼
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => removeFieldMutation.mutate({ fieldId: field.id })}
                          title="Delete Field"
                        >
                          ✕
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Builder Sidebar (Right 1 col) */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vibe & Theme</CardTitle>
                <CardDescription>
                  Choose a vibe for your form styling
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(PRESET_VIBES).map(([key, vibe]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setVibeMutation.mutate({ formId, vibeTokens: vibe })}
                    className={`w-full p-2.5 rounded-md border text-left text-xs flex items-center justify-between transition ${
                      currentVibe.preset === key
                        ? "border-primary bg-primary/10 font-semibold"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span className="capitalize">{key}</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-4 h-4 rounded-full border"
                        style={{ backgroundColor: vibe.primaryColor }}
                      />
                      <span
                        className="inline-block w-4 h-4 rounded-full border"
                        style={{ backgroundColor: vibe.backgroundColor }}
                      />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Form Details</CardTitle>
                <CardDescription>
                  Identity & slug configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs block">Public Slug:</span>
                  <form
                    className="flex items-center gap-2 mt-1"
                    onSubmit={(event) => {
                      event.preventDefault();
                      updateFormMutation.mutate({ id: formId, slug });
                    }}
                  >
                    <span className="font-mono text-xs">/f/</span>
                    <Input
                      value={slug}
                      onChange={(event) => setSlug(event.target.value)}
                      className="h-8 font-mono text-xs"
                      pattern="[a-z0-9-]+"
                      minLength={3}
                      maxLength={64}
                      aria-label="Public slug"
                    />
                    <Button type="submit" size="sm" variant="outline" disabled={updateFormMutation.isPending}>
                      Save
                    </Button>
                  </form>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Created At:</span>
                  <span>{new Date(form.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Questions Count:</span>
                  <span className="font-semibold">{form.fields.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Live Interactive Preview */
        <div className="max-w-2xl mx-auto py-4">
          <Card
            className="shadow-xl transition-all border-2"
            style={{
              backgroundColor: currentVibe.backgroundColor,
              color: currentVibe.textColor,
              borderRadius:
                currentVibe.borderRadius === "none"
                  ? "0px"
                  : currentVibe.borderRadius === "sm"
                    ? "4px"
                    : currentVibe.borderRadius === "md"
                      ? "8px"
                      : currentVibe.borderRadius === "lg"
                        ? "16px"
                        : "9999px",
              fontFamily:
                currentVibe.fontFamily === "mono"
                  ? "monospace"
                  : currentVibe.fontFamily === "serif"
                    ? "Georgia, serif"
                    : "sans-serif",
            }}
          >
            <CardHeader className="space-y-2 border-b pb-6">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Live Preview
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-mono uppercase"
                  style={{
                    backgroundColor: currentVibe.primaryColor,
                    color: "#ffffff",
                  }}
                >
                  Vibe: {currentVibe.preset}
                </span>
              </div>
              <CardTitle className="text-2xl" style={{ color: currentVibe.textColor }}>
                {form.title}
              </CardTitle>
              {form.description && (
                <CardDescription className="text-base" style={{ opacity: 0.8 }}>
                  {form.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {form.fields.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Add questions in the builder tab to see them rendered here.
                </p>
              ) : (
                form.fields.map((field, idx) => {
                  const config =
                    typeof field.config === "string"
                      ? JSON.parse(field.config)
                      : (field.config as Record<string, any> | null) || {};

                  return (
                    <div key={field.id} className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1">
                        <span>{idx + 1}. {field.label}</span>
                        {field.required && <span className="text-destructive">*</span>}
                      </Label>

                      {field.type === "short_text" && (
                        <Input
                          placeholder={config.placeholder || "Your answer..."}
                          disabled
                        />
                      )}

                      {field.type === "long_text" && (
                        <Textarea
                          placeholder={config.placeholder || "Type detailed answer here..."}
                          disabled
                          rows={3}
                        />
                      )}

                      {field.type === "single_choice" && (
                        <div className="space-y-2 pt-1">
                          {(config.options || []).map((opt: string, i: number) => (
                            <label
                              key={i}
                              className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded border bg-background hover:bg-muted/50"
                            >
                              <input
                                type="radio"
                                name={field.id}
                                disabled
                                className="accent-primary"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {field.type === "multiple_choice" && (
                        <div className="space-y-2 pt-1">
                          {(config.options || []).map((opt: string, i: number) => (
                            <label
                              key={i}
                              className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded border bg-background hover:bg-muted/50"
                            >
                              <input type="checkbox" disabled className="accent-primary" />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {field.type === "rating" && (
                        <div className="flex items-center gap-2 pt-1">
                          {Array.from({ length: config.maxRating || 5 }).map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              disabled
                              className="h-10 w-10 rounded border text-base font-semibold hover:border-primary flex items-center justify-center transition"
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                      )}

                      {field.type === "date" && (
                        <Input type="date" disabled className="w-full sm:w-64" />
                      )}

                      {field.type === "file_upload" && (
                        <div className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
                          📎 Click or drag file here to upload (max{" "}
                          {Math.round((config.maxSizeBytes || 10485760) / (1024 * 1024))}MB)
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {form.fields.length > 0 && (
                <div className="pt-4 border-t">
                  <Button
                    disabled
                    className="w-full sm:w-auto"
                    style={{
                      backgroundColor: currentVibe.primaryColor,
                      color: "#ffffff",
                    }}
                  >
                    Submit (Preview Mode)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
