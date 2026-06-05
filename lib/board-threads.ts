import type { ClipboardBoardItem } from "@/lib/clipboard-inbox-storage";

export function isBoardReply(item: ClipboardBoardItem): boolean {
  return typeof item.parentId === "string" && item.parentId.length > 0;
}

export function getRootBoardItems(items: ClipboardBoardItem[]): ClipboardBoardItem[] {
  const ids = new Set(items.map((item) => item.id));
  return items
    .filter((item) => !item.parentId || !ids.has(item.parentId))
    .sort((a, b) => b.at - a.at);
}

export function getDirectReplies(
  items: ClipboardBoardItem[],
  parentId: string
): ClipboardBoardItem[] {
  return items
    .filter((item) => item.parentId === parentId)
    .sort((a, b) => a.at - b.at);
}

/** Walk up the parent chain to see if itemId belongs under rootId. */
export function isInThreadBranch(
  items: ClipboardBoardItem[],
  rootId: string,
  itemId: string
): boolean {
  const byId = new Map(items.map((item) => [item.id, item]));
  let id: string | undefined = itemId;
  while (id) {
    if (id === rootId) return true;
    id = byId.get(id)?.parentId;
  }
  return false;
}

export function countThreadReplies(
  items: ClipboardBoardItem[],
  rootId: string
): number {
  const byParent = new Map<string, ClipboardBoardItem[]>();
  for (const item of items) {
    if (!item.parentId) continue;
    const list = byParent.get(item.parentId) ?? [];
    list.push(item);
    byParent.set(item.parentId, list);
  }

  let count = 0;
  const walk = (id: string) => {
    const children = byParent.get(id) ?? [];
    for (const child of children) {
      count += 1;
      walk(child.id);
    }
  };
  walk(rootId);
  return count;
}
