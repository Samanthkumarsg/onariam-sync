import type { ClipboardAssignee } from "@/lib/clipboard-assignee";
import type { ClipboardPayload } from "@/lib/clipboard-p2p";

export type ClipboardBoardItem = ClipboardPayload & {
  copiedToClipboard: boolean;
  assignee?: ClipboardAssignee | null;
};

/** @deprecated Use ClipboardBoardItem */
export type ClipboardInboxItem = ClipboardBoardItem;

const MAX_ITEMS = 50;
const KEY_PREFIX = "onariam-clipboard-inbox:";

function storageKey(topic: string) {
  return `${KEY_PREFIX}${topic}`;
}

export function loadClipboardBoard(topic: string): ClipboardBoardItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(topic));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClipboardBoardItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.id && typeof item.text === "string")
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

/** @deprecated Use loadClipboardBoard */
export const loadClipboardInbox = loadClipboardBoard;

export function saveClipboardBoard(topic: string, items: ClipboardBoardItem[]) {
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

/** @deprecated Use saveClipboardBoard */
export const saveClipboardInbox = saveClipboardBoard;

export function clearClipboardBoard(topic: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(topic));
}

/** @deprecated Use clearClipboardBoard */
export const clearClipboardInbox = clearClipboardBoard;

/** Prepend new items; update in place when the same id already exists (assignee / copied state). */
export function mergeClipboardItem(
  items: ClipboardBoardItem[],
  incoming: ClipboardBoardItem
): ClipboardBoardItem[] {
  const index = items.findIndex((item) => item.id === incoming.id);
  if (index === -1) {
    return [incoming, ...items].slice(0, MAX_ITEMS);
  }
  const next = [...items];
  next[index] = { ...next[index], ...incoming };
  return next;
}
