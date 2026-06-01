const ALLOWED_EXTERNAL_PROTOCOLS = new Set(["http:", "https:"]);

export function safeExternalUrl(value?: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    if (!ALLOWED_EXTERNAL_PROTOCOLS.has(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}
