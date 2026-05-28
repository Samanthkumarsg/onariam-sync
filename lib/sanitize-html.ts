import DOMPurify from "isomorphic-dompurify";

const CLIPBOARD_HTML_CONFIG = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "ul",
    "ol",
    "li",
    "a",
    "h1",
    "h2",
    "h3",
    "blockquote",
    "code",
    "pre",
    "span",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class"],
  ALLOW_DATA_ATTR: false,
};

/** Sanitize rich clipboard HTML before storage or render. */
export function sanitizeClipboardHtml(html: string | undefined): string | undefined {
  if (!html?.trim()) return undefined;
  const clean = DOMPurify.sanitize(html.trim(), CLIPBOARD_HTML_CONFIG);
  return clean.length > 0 ? clean : undefined;
}
