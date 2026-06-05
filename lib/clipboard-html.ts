/** Plain text extracted from TipTap / clipboard HTML (client-only). */

export function plainTextFromHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";
  if (typeof document === "undefined") {
    return trimmed
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  const div = document.createElement("div");
  div.innerHTML = trimmed;
  return (div.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

export function isEmptyEditorHtml(html: string): boolean {
  return plainTextFromHtml(html).length === 0;
}

/** Escape plain text as a single TipTap paragraph with line breaks. */
export function textToEscapedHtml(text: string): string {
  return `<p>${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>")}</p>`;
}
