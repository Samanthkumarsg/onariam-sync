import type { ClipboardBoardItem } from "@/lib/clipboard-inbox-storage";
import { clipboardChannelName } from "@/lib/clipboard-p2p";

export const CLIPBOARD_INBOX_EVENT = "clipboard-inbox-sync";

export type ClipboardInboxSyncRequest = {
  kind: "sync-request";
  from: string;
};

export type ClipboardInboxSyncBatch = {
  kind: "sync-batch";
  from: string;
  items: ClipboardBoardItem[];
};

export type ClipboardInboxUpsert = {
  kind: "upsert";
  from: string;
  item: ClipboardBoardItem;
};

export type ClipboardInboxRoomMessage =
  | ClipboardInboxSyncRequest
  | ClipboardInboxSyncBatch
  | ClipboardInboxUpsert;

export function inboxChannelName(code: string): string {
  return clipboardChannelName(code);
}

export function isInboxRoomMessage(
  payload: unknown
): payload is ClipboardInboxRoomMessage {
  if (!payload || typeof payload !== "object") return false;
  const kind = (payload as { kind?: string }).kind;
  if (kind === "sync-request") {
    return typeof (payload as ClipboardInboxSyncRequest).from === "string";
  }
  if (kind === "sync-batch") {
    const batch = payload as ClipboardInboxSyncBatch;
    return (
      typeof batch.from === "string" && Array.isArray(batch.items)
    );
  }
  if (kind === "upsert") {
    const upsert = payload as ClipboardInboxUpsert;
    const item = upsert.item;
    return (
      typeof upsert.from === "string" &&
      item != null &&
      typeof item.id === "string" &&
      (typeof item.text === "string" ||
        (item.type === "file" && typeof item.cid === "string"))
    );
  }
  return false;
}
