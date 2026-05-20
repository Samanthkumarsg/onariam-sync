/** Turn a user-entered URL into the app proxy path shown in the shared iframe. */
export function browseProxyUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return `/api/browse?url=${encodeURIComponent(trimmed)}`;
}

export function normalizeBrowseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
