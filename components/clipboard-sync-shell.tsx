"use client";

import { Clipboard, ClipboardCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ClipboardCompose } from "@/components/clipboard-compose";
import { ClipboardInboxItemCard } from "@/components/clipboard-inbox-item";
import { LeaveSessionDialog } from "@/components/leave-session-dialog";
import { SessionToolbar } from "@/components/session-toolbar";
import { useClipboardP2p } from "@/hooks/use-clipboard-p2p";
import { useRoomMembers } from "@/hooks/use-room-members";
import type { ClipboardAssignee } from "@/lib/clipboard-assignee";
import type { ClipboardPayload } from "@/lib/clipboard-p2p";
import {
  clearClipboardInbox,
  loadClipboardInbox,
  saveClipboardInbox,
  upsertClipboardItem,
  type ClipboardInboxItem,
} from "@/lib/clipboard-inbox-storage";
import { meetShareUrl, sendShareUrl } from "@/lib/meet-code";
import type { RoomSession } from "@/lib/room-session";
import { eyebrow, panel, subhead } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  session: RoomSession;
  onLeave: () => void;
};

function downloadClipboardItems(items: ClipboardInboxItem[], topic: string) {
  const body = items
    .map(
      (item) => `[${new Date(item.at).toLocaleString()}]\n${item.text}`
    )
    .join("\n\n---\n\n");
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `onariam-sync-${topic}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function toInboxItem(
  payload: ClipboardPayload,
  copiedToClipboard = false
): ClipboardInboxItem {
  return { ...payload, copiedToClipboard };
}

export function ClipboardSyncShell({ session, onLeave }: Props) {
  const sendUrl = useMemo(
    () => sendShareUrl(session.topic),
    [session.topic]
  );

  const [items, setItems] = useState<ClipboardInboxItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [autoCopiedId, setAutoCopiedId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSendLink, setCopiedSendLink] = useState(false);
  const [showSendUrl, setShowSendUrl] = useState(false);
  const [showQr, setShowQr] = useState(true);
  const [autoCopy, setAutoCopy] = useState(true);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  const { members } = useRoomMembers(
    session.topic,
    session.deviceFingerprint,
    session.deviceFingerprint,
    Boolean(session.isHost)
  );

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const p2p = useClipboardP2p({
    code: session.topic,
    role: "desktop",
    localId: session.deviceFingerprint,
  });

  const persistItems = useCallback(
    (next: ClipboardInboxItem[]) => {
      setItems(next);
      saveClipboardInbox(session.topic, next);
    },
    [session.topic]
  );

  const addItem = useCallback(
    (incoming: ClipboardInboxItem) => {
      persistItems(upsertClipboardItem(itemsRef.current, incoming));
    },
    [persistItems]
  );

  const updateAssignee = useCallback(
    (id: string, assignee: ClipboardAssignee | null) => {
      persistItems(
        itemsRef.current.map((row) =>
          row.id === id ? { ...row, assignee } : row
        )
      );
    },
    [persistItems]
  );

  useEffect(() => {
    const stored = loadClipboardInbox(session.topic);
    setItems(stored);
    setHydrated(true);
  }, [session.topic]);

  useEffect(() => {
    if (p2p.status === "connected") {
      setShowQr(false);
    }
  }, [p2p.status]);

  const handleReceive = useCallback(
    async (payload: ClipboardPayload) => {
      let copiedToClipboard = false;
      if (autoCopy && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(payload.text);
          copiedToClipboard = true;
          setAutoCopiedId(payload.id);
          setTimeout(() => setAutoCopiedId(null), 2500);
        } catch {
          copiedToClipboard = false;
        }
      }
      p2p.sendAck(payload.id, copiedToClipboard);
      addItem(
        toInboxItem(
          {
            ...payload,
            source: payload.source ?? "mobile",
          },
          copiedToClipboard
        )
      );
    },
    [autoCopy, p2p, addItem]
  );

  useEffect(() => {
    p2p.onReceive((payload) => {
      void handleReceive(payload);
    });
  }, [p2p, handleReceive]);

  const copyItem = async (item: ClipboardInboxItem) => {
    try {
      await navigator.clipboard.writeText(item.text);
      setCopiedId(item.id);
      persistItems(
        itemsRef.current.map((row) =>
          row.id === item.id ? { ...row, copiedToClipboard: true } : row
        )
      );
      p2p.sendAck(item.id, true);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      p2p.sendAck(item.id, false);
    }
  };

  const requestLeave = () => {
    if (items.length === 0) {
      onLeave();
      return;
    }
    setLeaveOpen(true);
  };

  const handleEraseLeave = () => {
    clearClipboardInbox(session.topic);
    onLeave();
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <LeaveSessionDialog
        open={leaveOpen}
        itemCount={items.length}
        onSave={() => {
          downloadClipboardItems(items, session.topic);
          onLeave();
        }}
        onErase={handleEraseLeave}
        onCancel={() => setLeaveOpen(false)}
      />

      <SessionToolbar
        session={session}
        sendUrl={sendUrl}
        p2pStatus={p2p.status}
        p2pError={p2p.error}
        showQr={showQr}
        onToggleQr={() => setShowQr((v) => !v)}
        copiedInvite={copiedLink}
        onCopyInvite={() => {
          void navigator.clipboard.writeText(meetShareUrl(session.topic));
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 1500);
        }}
        copiedSendLink={copiedSendLink}
        onCopySendLink={() => {
          void navigator.clipboard.writeText(sendUrl);
          setCopiedSendLink(true);
          setTimeout(() => setCopiedSendLink(false), 1500);
        }}
        showSendUrl={showSendUrl}
        onToggleSendUrl={() => setShowSendUrl((v) => !v)}
        onLeave={requestLeave}
      />

      {autoCopiedId && (
        <div
          className="pointer-events-none fixed bottom-safe left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-500/30 bg-card px-4 py-2.5 text-sm font-medium text-emerald-400 shadow-xl"
          role="status"
        >
          <ClipboardCheck className="size-4 shrink-0" aria-hidden />
          Copied to clipboard
        </div>
      )}

      <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-4 px-safe py-4 sm:px-6 sm:py-6 md:py-8">
        <ClipboardCompose
          isHost={Boolean(session.isHost)}
          displayName={session.displayName}
          deviceFingerprint={session.deviceFingerprint}
          members={members}
          open={composeOpen}
          onOpenChange={setComposeOpen}
          onAdd={addItem}
          onBroadcast={(item) => {
            if (p2p.status === "connected") {
              p2p.sendPayload(item.text, {
                html: item.html,
                source: item.source,
                author: item.author,
                assignee: item.assignee,
                id: item.id,
                at: item.at,
              });
            }
          }}
        />

        <section
          className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4"
          aria-label="Clipboard inbox"
        >
          <header className="flex shrink-0 flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:pb-4">
            <div className="min-w-0 space-y-0.5 sm:space-y-1">
              <p className={eyebrow}>Inbox</p>
              <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
                Clipboard inbox
              </h1>
              <p className={cn(subhead, "text-xs sm:text-sm")}>
                {!hydrated
                  ? "Loading saved items…"
                  : items.length === 0
                    ? "Received text appears here and stays after refresh."
                    : `${items.length} item${items.length === 1 ? "" : "s"} · saved on this device`}
              </p>
            </div>

            <label className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-surface-elevated touch-manipulation sm:w-auto sm:shrink-0 sm:py-2">
              <input
                type="checkbox"
                checked={autoCopy}
                onChange={(e) => setAutoCopy(e.target.checked)}
                className="size-4 shrink-0 rounded border-border accent-primary"
              />
              <span className="select-none">Auto-copy latest</span>
            </label>
          </header>

          {!hydrated ? (
            <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted-foreground">
              Loading inbox…
            </div>
          ) : items.length === 0 ? (
            <div
              className={cn(
                panel,
                "flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center sm:px-6 sm:py-16"
              )}
            >
              <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-surface-elevated">
                <Clipboard
                  className="size-7 text-muted-foreground/60"
                  aria-hidden
                />
              </div>
              <div className="max-w-sm space-y-2">
                <p className="text-base font-medium text-foreground">
                  Nothing here yet
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setComposeOpen(true)}
                    className="font-medium text-primary underline-offset-2 touch-manipulation hover:underline"
                  >
                    Add to inbox
                  </button>
                  , scan{" "}
                  <button
                    type="button"
                    onClick={() => setShowQr(true)}
                    className="font-medium text-primary underline-offset-2 touch-manipulation hover:underline"
                  >
                    QR
                  </button>{" "}
                  to pair your phone, or send from the mobile page.
                </p>
              </div>
            </div>
          ) : (
            <ul
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pb-safe [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
              aria-label="Received clipboard items"
            >
              {items.map((item, index) => (
                <ClipboardInboxItemCard
                  key={item.id}
                  item={item}
                  isLatest={index === 0}
                  highlightCopy={autoCopiedId === item.id}
                  copying={copiedId === item.id}
                  members={members}
                  currentDeviceFingerprint={session.deviceFingerprint}
                  onAssigneeChange={updateAssignee}
                  onCopy={() => void copyItem(item)}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
