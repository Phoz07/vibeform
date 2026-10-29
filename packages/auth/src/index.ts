import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@vibeform/db";
import * as schema from "@vibeform/db/schema/auth";
import { betterAuth } from "better-auth";

export type AuthConfig = {
	BETTER_AUTH_URL: string;
	BETTER_AUTH_SECRET: string;
	CORS_ORIGIN: string;
};

const additionalTrustedOrigins = [
	"https://vibeform-web-live-phos-yzh42clevvg333kg.maverxk07.workers.dev",
	"http://localhost:3000",
	"http://localhost:3001",
];

export function createAuth(
	env: AuthConfig,
	database: Database,
	desktopOrigins: readonly string[] = [],
) {
	return betterAuth({
		database: drizzleAdapter(database, {
			provider: "sqlite",
			schema,
		}),
		trustedOrigins: [
			env.CORS_ORIGIN,
			...additionalTrustedOrigins,
			...desktopOrigins,
		],
		emailAndPassword: { enabled: true },
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
		},
		plugins: [],
	});
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
