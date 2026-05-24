import type { ClipboardAssignee } from "@/lib/clipboard-assignee";
import type { ClipboardPayload } from "@/lib/clipboard-p2p";

export type ClipboardInboxItem = ClipboardPayload & {
  copiedToClipboard: boolean;
  assignee?: ClipboardAssignee | null;
};

const MAX_ITEMS = 50;
const KEY_PREFIX = "onariam-clipboard-inbox:";

function storageKey(topic: string) {
  return `${KEY_PREFIX}${topic}`;
}

export function loadClipboardInbox(topic: string): ClipboardInboxItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(topic));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClipboardInboxItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.id && typeof item.text === "string")
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function saveClipboardInbox(topic: string, items: ClipboardInboxItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      storageKey(topic),
      JSON.stringify(items.slice(0, MAX_ITEMS))
    );
  } catch {
    /* quota or private mode */
  }
}

export function clearClipboardInbox(topic: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(topic));
}

/** Prepend new items; update in place when the same id already exists (assignee / copied state). */
export function mergeClipboardItem(
  items: ClipboardInboxItem[],
  incoming: ClipboardInboxItem
): ClipboardInboxItem[] {
  const index = items.findIndex((item) => item.id === incoming.id);
  if (index === -1) {
    return [incoming, ...items].slice(0, MAX_ITEMS);
  }
  const next = [...items];
  next[index] = { ...next[index], ...incoming };
  return next;
}
