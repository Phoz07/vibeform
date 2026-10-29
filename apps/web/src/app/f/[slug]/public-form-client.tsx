"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { DEFAULT_VIBE, validateAnswerValue } from "@vibeform/api";
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
import { Textarea } from "@vibeform/ui/components/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/utils/trpc";
import { VibeProvider } from "@/components/vibe-provider";

type Value =
	| string
	| string[]
	| { token: string; attachmentId: string; fileName: string };
type Config = Record<string, unknown>;

function parseConfig(config: unknown): Config {
	if (typeof config === "string") {
		try {
			const parsed: unknown = JSON.parse(config);
			return parsed && typeof parsed === "object" && !Array.isArray(parsed)
				? (parsed as Config)
				: {};
		} catch {
			return {};
		}
	}
	return config && typeof config === "object" && !Array.isArray(config)
		? (config as Config)
		: {};
}

function vibeStyle(vibeTokens: unknown) {
	const vibe = parseConfig(vibeTokens);
	const radius = {
		none: "0px",
		sm: "4px",
		md: "8px",
		lg: "16px",
		full: "9999px",
	};
	const fonts = {
		sans: "sans-serif",
		serif: "Georgia, serif",
		mono: "monospace",
		rounded: "ui-rounded, sans-serif",
	};
	const borderRadius = vibe.borderRadius;
	const fontFamily = vibe.fontFamily;
	return {
		backgroundColor:
			typeof vibe.backgroundColor === "string"
				? vibe.backgroundColor
				: DEFAULT_VIBE.backgroundColor,
		color:
			typeof vibe.textColor === "string"
				? vibe.textColor
				: DEFAULT_VIBE.textColor,
		borderRadius:
			typeof borderRadius === "string" && borderRadius in radius
				? radius[borderRadius as keyof typeof radius]
				: radius.md,
		fontFamily:
			typeof fontFamily === "string" && fontFamily in fonts
				? fonts[fontFamily as keyof typeof fonts]
				: fonts.sans,
	};
}

export default function PublicFormClient({ slug }: { slug: string }) {
	const trpc = useTRPC();
	const formQuery = useQuery(trpc.form.getPublic.queryOptions({ slug }));
	const [values, setValues] = useState<Record<string, Value>>({});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
		{},
	);
	const [submitted, setSubmitted] = useState(false);
	const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, "");

	const submitMutation = useMutation(
		trpc.form.submit.mutationOptions({
			onSuccess: () => setSubmitted(true),
			onError: (error) => toast.error(error.message || "Unable to submit form"),
		}),
	);

	if (formQuery.isLoading) {
		return (
			<div className="text-muted-foreground container mx-auto max-w-2xl px-4 py-16 text-center">
				Loading form...
			</div>
		);
	}
	if (formQuery.isError || !formQuery.data) {
		return (
			<div className="text-destructive container mx-auto max-w-2xl px-4 py-16 text-center">
				This form is unavailable.
			</div>
		);
	}
	if (submitted) {
		return (
			<main className="container mx-auto max-w-2xl px-4 py-16">
				<Card className="text-center">
					<CardContent className="space-y-3 py-16">
						<h1 className="text-2xl font-bold">Thank you!</h1>
						<p className="text-muted-foreground">
							Your response has been submitted successfully.
						</p>
					</CardContent>
				</Card>
			</main>
		);
	}

	const form = formQuery.data;
	const style = vibeStyle(form.vibeTokens);
	const vibe = parseConfig(form.vibeTokens);
	const primaryColor =
		typeof vibe.primaryColor === "string"
			? vibe.primaryColor
			: DEFAULT_VIBE.primaryColor;

	const setValue = (fieldId: string, value: Value) => {
		setValues((current) => ({ ...current, [fieldId]: value }));
		const field = form.fields.find((candidate) => candidate.id === fieldId);
		if (!field) return;
		const result = validateAnswerValue(
			field.type,
			field.config,
			value,
			field.required,
		);
		setErrors((current) => ({
			...current,
			[fieldId]: result.valid ? "" : (result.error ?? "Invalid answer."),
		}));
	};

	const uploadFile = async (fieldId: string, file: File) => {
		if (!serverUrl) {
			toast.error("Upload service is unavailable");
			return;
		}
		const body = new FormData();
		body.append("file", file);
		body.append("fieldId", fieldId);
		await new Promise<void>((resolve) => {
			const request = new XMLHttpRequest();
			request.open("POST", `${serverUrl}/f/${encodeURIComponent(slug)}/upload`);
			request.withCredentials = true;
			request.upload.onprogress = (event) => {
				if (event.lengthComputable) {
					setUploadProgress((current) => ({
						...current,
						[fieldId]: Math.round((event.loaded / event.total) * 100),
					}));
				}
			};
			request.onload = () => {
				try {
					const result = JSON.parse(request.responseText) as {
						token?: string;
						attachmentId?: string;
						error?: string;
					};
					if (
						request.status < 200 ||
						request.status >= 300 ||
						!result.token ||
						!result.attachmentId
					) {
						throw new Error(result.error || "Unable to upload file");
					}
					setValue(fieldId, {
						token: result.token,
						attachmentId: result.attachmentId,
						fileName: file.name,
					});
					setUploadProgress((current) => ({ ...current, [fieldId]: 100 }));
				} catch (error) {
					toast.error(
						error instanceof Error ? error.message : "Unable to upload file",
					);
				} finally {
					resolve();
				}
			};
			request.onerror = () => {
				toast.error("Unable to upload file");
				resolve();
			};
			request.send(body);
		});
	};

	const validate = () => {
		const nextErrors: Record<string, string> = {};
		for (const field of form.fields) {
			const result = validateAnswerValue(
				field.type,
				field.config,
				values[field.id],
				field.required,
			);
			if (!result.valid)
				nextErrors[field.id] = result.error ?? "Invalid answer.";
		}
		setErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	};

	return (
		<VibeProvider
			vibe={typeof vibe.preset === "string" ? vibe.preset : undefined}
		>
			<main className="container mx-auto max-w-2xl px-4 py-8">
				<Card className="border-2 shadow-xl" style={style}>
					<CardHeader className="border-b pb-6">
						<CardTitle style={{ color: primaryColor }}>{form.title}</CardTitle>
						{form.description && (
							<CardDescription>{form.description}</CardDescription>
						)}
					</CardHeader>
					<CardContent className="p-6">
						<form
							className="space-y-6"
							onSubmit={(event) => {
								event.preventDefault();
								if (!validate()) return;
								submitMutation.mutate({
									slug,
									answers: form.fields
										.filter((field) => values[field.id] !== undefined)
										.map((field) => ({
											fieldId: field.id,
											value: values[field.id],
										})),
								});
							}}
						>
							{form.fields.map((field, index) => {
								const config = parseConfig(field.config);
								const error = errors[field.id];
								const value = values[field.id] ?? "";
								return (
									<div key={field.id} className="space-y-2">
										<Label htmlFor={field.id}>
											{index + 1}. {field.label}{" "}
											{field.required && (
												<span className="text-destructive">*</span>
											)}
										</Label>
										{field.type === "short_text" && (
											<Input
												id={field.id}
												value={typeof value === "string" ? value : ""}
												placeholder={
													typeof config.placeholder === "string"
														? config.placeholder
														: undefined
												}
												minLength={
													typeof config.minLength === "number"
														? config.minLength
														: undefined
												}
												maxLength={
													typeof config.maxLength === "number"
														? config.maxLength
														: undefined
												}
												onChange={(event) =>
													setValue(field.id, event.target.value)
												}
											/>
										)}
										{field.type === "long_text" && (
											<Textarea
												id={field.id}
												value={typeof value === "string" ? value : ""}
												placeholder={
													typeof config.placeholder === "string"
														? config.placeholder
														: undefined
												}
												minLength={
													typeof config.minLength === "number"
														? config.minLength
														: undefined
												}
												maxLength={
													typeof config.maxLength === "number"
														? config.maxLength
														: undefined
												}
												onChange={(event) =>
													setValue(field.id, event.target.value)
												}
											/>
										)}
										{field.type === "single_choice" && (
											<div className="space-y-2">
												{Array.isArray(config.options) &&
													config.options.map((option) => (
														<label
															key={String(option)}
															className="bg-background flex items-center gap-2 rounded border p-2"
														>
															<input
																type="radio"
																name={field.id}
																value={String(option)}
																checked={value === String(option)}
																onChange={(event) =>
																	setValue(field.id, event.target.value)
																}
															/>
															{String(option)}
														</label>
													))}
											</div>
										)}
										{field.type === "multiple_choice" && (
											<div className="space-y-2">
												{Array.isArray(config.options) &&
													config.options.map((option) => {
														const selected =
															Array.isArray(value) &&
															value.includes(String(option));
														return (
															<label
																key={String(option)}
																className="bg-background flex items-center gap-2 rounded border p-2"
															>
																<input
																	type="checkbox"
																	checked={selected}
																	onChange={(event) => {
																		const current = Array.isArray(value)
																			? value
																			: [];
																		setValue(
																			field.id,
																			event.target.checked
																				? [...current, String(option)]
																				: current.filter(
																						(item) => item !== String(option),
																					),
																		);
																	}}
																/>
																{String(option)}
															</label>
														);
													})}
											</div>
										)}
										{field.type === "rating" && (
											<div className="flex flex-wrap gap-2">
												{Array.from(
													{
														length:
															typeof config.maxRating === "number"
																? config.maxRating
																: 5,
													},
													(_, rating) => rating + 1,
												).map((rating) => (
													<Button
														key={rating}
														type="button"
														variant={
															value === String(rating) ? "default" : "outline"
														}
														onClick={() => setValue(field.id, String(rating))}
													>
														{rating}
													</Button>
												))}
											</div>
										)}
										{field.type === "date" && (
											<Input
												id={field.id}
												type="date"
												value={typeof value === "string" ? value : ""}
												min={
													typeof config.minDate === "string"
														? config.minDate
														: undefined
												}
												max={
													typeof config.maxDate === "string"
														? config.maxDate
														: undefined
												}
												onChange={(event) =>
													setValue(field.id, event.target.value)
												}
											/>
										)}
										{field.type === "file_upload" && (
											<div
												className="flex flex-col gap-2 rounded-md border border-dashed p-4 text-sm"
												onDragOver={(event) => event.preventDefault()}
												onDrop={(event) => {
													event.preventDefault();
													const file = event.dataTransfer.files[0];
													if (file) void uploadFile(field.id, file);
												}}
											>
												<p className="text-muted-foreground">
													Drop a file here or choose one.
												</p>
												<Input
													id={field.id}
													type="file"
													accept={
														Array.isArray(config.allowedMimeTypes)
															? config.allowedMimeTypes.map(String).join(",")
															: undefined
													}
													onChange={(event) => {
														const file = event.target.files?.[0];
														if (file) void uploadFile(field.id, file);
													}}
												/>
												{uploadProgress[field.id] !== undefined &&
													uploadProgress[field.id] < 100 && (
														<progress
															className="h-2 w-full"
															max={100}
															value={uploadProgress[field.id]}
															aria-label={`Uploading ${uploadProgress[field.id]} percent`}
														/>
													)}
											</div>
										)}
										{field.type === "file_upload" &&
											typeof value === "object" &&
											"fileName" in value && (
												<p className="text-muted-foreground text-sm">
													Uploaded: {value.fileName}
												</p>
											)}
										{error && (
											<p className="text-destructive text-sm">{error}</p>
										)}
									</div>
								);
							})}
							<Button
								type="submit"
								className="w-full"
								disabled={submitMutation.isPending}
								style={{ backgroundColor: primaryColor }}
							>
								{submitMutation.isPending ? "Submitting..." : "Submit response"}
							</Button>
						</form>
					</CardContent>
				</Card>
			</main>
		</VibeProvider>
	);
}
