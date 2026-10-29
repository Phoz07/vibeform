export type AttachmentTokenPayload = {
	id: string;
	formId: string;
	fieldId: string;
	r2Key: string;
	fileName: string;
	mimeType: string;
	sizeBytes: number;
	expiresAt: number;
};

const encoder = new TextEncoder();

function base64UrlEncode(value: Uint8Array) {
	let binary = "";
	for (const byte of value) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replaceAll("=", "");
}

function base64UrlDecode(value: string) {
	const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
	const binary = atob(
		normalized + "=".repeat((4 - (normalized.length % 4)) % 4),
	);
	return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sign(value: string, secret: string) {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	return base64UrlEncode(
		new Uint8Array(
			await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
		),
	);
}

export async function createAttachmentToken(
	payload: AttachmentTokenPayload,
	secret: string,
) {
	const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
	return `${body}.${await sign(body, secret)}`;
}

export async function verifyAttachmentToken(token: string, secret: string) {
	const [body, signature] = token.split(".");
	if (!body || !signature) return null;
	const expected = await sign(body, secret);
	const receivedBytes = encoder.encode(signature);
	const expectedBytes = encoder.encode(expected);
	if (receivedBytes.length !== expectedBytes.length) return null;
	let difference = 0;
	for (let index = 0; index < receivedBytes.length; index += 1) {
		difference |= (receivedBytes[index] ?? 0) ^ (expectedBytes[index] ?? 0);
	}
	if (difference !== 0) return null;

	try {
		const payload = JSON.parse(
			new TextDecoder().decode(base64UrlDecode(body)),
		) as AttachmentTokenPayload;
		return payload.expiresAt > Date.now() ? payload : null;
	} catch {
		return null;
	}
}

export function detectMimeType(bytes: Uint8Array) {
	if (
		bytes.length >= 3 &&
		bytes[0] === 0xff &&
		bytes[1] === 0xd8 &&
		bytes[2] === 0xff
	) {
		return "image/jpeg";
	}
	if (
		bytes.length >= 8 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47 &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a &&
		bytes[6] === 0x1a &&
		bytes[7] === 0x0a
	) {
		return "image/png";
	}
	if (
		bytes.length >= 12 &&
		new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
		new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
	) {
		return "image/webp";
	}
	if (
		bytes.length >= 4 &&
		new TextDecoder().decode(bytes.slice(0, 4)) === "%PDF"
	) {
		return "application/pdf";
	}
	return null;
}

function readUint32(bytes: Uint8Array, offset: number) {
	return (
		(((bytes[offset] ?? 0) << 24) |
			((bytes[offset + 1] ?? 0) << 16) |
			((bytes[offset + 2] ?? 0) << 8) |
			(bytes[offset + 3] ?? 0)) >>>
		0
	);
}

export function stripImageMetadata(bytes: Uint8Array, mimeType: string) {
	if (mimeType === "image/jpeg") {
		if (bytes.length < 2) return bytes;
		const output = [bytes[0] ?? 0, bytes[1] ?? 0];
		let offset = 2;
		while (offset + 1 < bytes.length) {
			if (bytes[offset] !== 0xff) {
				output.push(...bytes.slice(offset));
				break;
			}
			const marker = bytes[offset + 1] ?? 0;
			if (marker === 0xda) {
				output.push(...bytes.slice(offset));
				break;
			}
			if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) {
				output.push(0xff, marker);
				offset += 2;
				continue;
			}
			if (offset + 4 > bytes.length) break;
			const segmentLength =
				((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
			const segmentEnd = offset + 2 + segmentLength;
			if (segmentEnd > bytes.length) break;
			if (marker !== 0xe1) {
				output.push(...bytes.slice(offset, segmentEnd));
			}
			offset = segmentEnd;
		}
		return new Uint8Array(output);
	}

	if (mimeType === "image/png") {
		const output = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
		let offset = 8;
		while (offset + 12 <= bytes.length) {
			const length = readUint32(bytes, offset);
			const chunkEnd = offset + 12 + length;
			if (chunkEnd > bytes.length) break;
			const type = new TextDecoder().decode(
				bytes.slice(offset + 4, offset + 8),
			);
			if (type !== "eXIf") {
				output.push(...bytes.slice(offset, chunkEnd));
			}
			offset = chunkEnd;
		}
		return new Uint8Array(output);
	}

	if (mimeType === "image/webp" && bytes.length >= 12) {
		const output = Array.from(bytes.slice(0, 12));
		let offset = 12;
		while (offset + 8 <= bytes.length) {
			const size =
				(bytes[offset + 4] ?? 0) |
				((bytes[offset + 5] ?? 0) << 8) |
				((bytes[offset + 6] ?? 0) << 16) |
				((bytes[offset + 7] ?? 0) << 24);
			const chunkEnd = offset + 8 + size + (size % 2);
			if (chunkEnd > bytes.length) break;
			const type = new TextDecoder().decode(bytes.slice(offset, offset + 4));
			if (type !== "EXIF") output.push(...bytes.slice(offset, chunkEnd));
			offset = chunkEnd;
		}
		const dataSize = output.length - 8;
		output[4] = dataSize & 0xff;
		output[5] = (dataSize >>> 8) & 0xff;
		output[6] = (dataSize >>> 16) & 0xff;
		output[7] = (dataSize >>> 24) & 0xff;
		return new Uint8Array(output);
	}

	return bytes;
}
