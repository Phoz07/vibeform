const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array) {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replaceAll("=", "");
}

export async function hashMcpToken(token: string) {
	const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
	return base64UrlEncode(new Uint8Array(digest));
}

export function generateMcpToken() {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return `vfm_${base64UrlEncode(bytes)}`;
}
