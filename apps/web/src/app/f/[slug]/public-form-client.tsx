"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { useTRPC } from "@/utils/trpc";
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

type Value = string | string[];
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
	const [submitted, setSubmitted] = useState(false);

	const submitMutation = useMutation(
		trpc.form.submit.mutationOptions({
			onSuccess: () => setSubmitted(true),
			onError: (error) => toast.error(error.message || "Unable to submit form"),
		}),
	);

	if (formQuery.isLoading) {
		return (
			<div className="container mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
				Loading form...
			</div>
		);
	}
	if (formQuery.isError || !formQuery.data) {
		return (
			<div className="container mx-auto max-w-2xl px-4 py-16 text-center text-destructive">
				This form is unavailable.
			</div>
		);
	}
	if (submitted) {
		return (
			<main className="container mx-auto max-w-2xl px-4 py-16">
				<Card className="text-center">
					<CardContent className="py-16 space-y-3">
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
														className="flex items-center gap-2 rounded border bg-background p-2"
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
															className="flex items-center gap-2 rounded border bg-background p-2"
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
										<Input
											id={field.id}
											type="file"
											accept={
												Array.isArray(config.allowedMimeTypes)
													? config.allowedMimeTypes.map(String).join(",")
													: undefined
											}
											onChange={(event) =>
												setValue(field.id, event.target.files?.[0]?.name ?? "")
											}
										/>
									)}
									{error && <p className="text-sm text-destructive">{error}</p>}
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
	);
}
