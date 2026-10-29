export function generateSlug(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let slug = "";
  for (let i = 0; i < length; i++) {
    const byte = bytes[i] ?? 0;
    slug += chars[byte % chars.length] ?? "a";
  }
  return slug;
}
