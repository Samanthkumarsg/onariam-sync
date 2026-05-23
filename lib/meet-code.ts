/** Sync session codes: abc-defg-hijk (3-4-3 lowercase letters) */

const MEET_CODE_RE = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

export function formatMeetCode(raw: string): string {
  const letters = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (letters.length !== 10) {
    return raw.toLowerCase().trim();
  }
  return `${letters.slice(0, 3)}-${letters.slice(3, 7)}-${letters.slice(7, 10)}`;
}

export function normalizeMeetCodeInput(input: string): string {
  const letters = input.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10);
  if (letters.length <= 3) return letters;
  if (letters.length <= 7) {
    return `${letters.slice(0, 3)}-${letters.slice(3)}`;
  }
  return `${letters.slice(0, 3)}-${letters.slice(3, 7)}-${letters.slice(7)}`;
}

export function isValidMeetCode(code: string): boolean {
  return MEET_CODE_RE.test(formatMeetCode(code));
}

/** Compact display for narrow headers: abc-…-hijk */
export function formatCompactMeetCode(code: string): string {
  const formatted = formatMeetCode(code);
  const parts = formatted.split("-");
  if (parts.length === 3 && parts.every((p) => p.length > 0)) {
    return `${parts[0]}-…-${parts[2]}`;
  }
  if (formatted.length > 11) {
    return `${formatted.slice(0, 4)}…${formatted.slice(-4)}`;
  }
  return formatted;
}

export function meetPath(code: string): string {
  return `/sync/${formatMeetCode(code)}`;
}

export function meetShareUrl(code: string): string {
  if (typeof window === "undefined") {
    return meetPath(code);
  }
  return `${window.location.origin}${meetPath(code)}`;
}

/** Mobile sender page — scan this from the desktop QR */
export function sendPath(code: string): string {
  return `/send/${formatMeetCode(code)}`;
}

export function sendShareUrl(code: string): string {
  if (typeof window === "undefined") {
    return sendPath(code);
  }
  return `${window.location.origin}${sendPath(code)}`;
}
