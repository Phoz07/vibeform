import type { Context as ApiContext } from "@vibeform/api/context";
import type { Context as HonoContext } from "hono";

import { ENV } from "./env.server";
import { createAuth, getDefinitionsDb, getResponsesDb } from "./services";

export type CreateContextOptions = {
	context: HonoContext;
};

export async function createContext({
	context,
}: CreateContextOptions): Promise<ApiContext> {
	const definitionsDb = getDefinitionsDb();
	let responsesDb = undefined;
	try {
		responsesDb = getResponsesDb();
	} catch {
		// If not bound in test or specific env
	}

	const session = await (await createAuth(definitionsDb)).api.getSession({
		headers: context.req.raw.headers,
	});

	return {
		db: definitionsDb,
		definitionsDb,
		responsesDb,
		attachments: (ENV as unknown as { ATTACHMENTS?: R2Bucket }).ATTACHMENTS,
		attachmentSecret: ENV.BETTER_AUTH_SECRET,
		session,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
