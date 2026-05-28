/** Plain text extracted from TipTap / clipboard HTML (client-only). */

import { sanitizeClipboardHtml } from "@/lib/sanitize-html";

export function plainTextFromHtml(html: string): string {
  const trimmed = sanitizeClipboardHtml(html) ?? html.trim();
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

/** True when HTML carries visible rich content (not an empty TipTap doc). */
export function hasRichHtmlContent(html: string | undefined): boolean {
  if (!html?.trim()) return false;
  return !isEmptyEditorHtml(html);
}
