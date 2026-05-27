"use client";

import { ClipboardCheck, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ClipboardCompose } from "@/components/clipboard-compose";
import { ClipboardInboxItemCard } from "@/components/clipboard-inbox-item";
import { HostPendingBanner } from "@/components/host-pending-banner";
import { InboxEmptyState } from "@/components/inbox-empty-state";
import { LeaveSessionDialog } from "@/components/leave-session-dialog";
import { SessionAiPanel } from "@/components/session-ai-panel";
import { SessionToolbar } from "@/components/session-toolbar";
import { Button } from "@/components/ui/button";
import { useClipboardP2p } from "@/hooks/use-clipboard-p2p";
import { useClipboardRoomSync } from "@/hooks/use-clipboard-room-sync";
import { useRoomMembers } from "@/hooks/use-room-members";
import type { ClipboardAssignee } from "@/lib/clipboard-assignee";
import type { ClipboardPayload } from "@/lib/clipboard-p2p";
import {
  clearClipboardInbox,
  loadClipboardInbox,
  saveClipboardInbox,
  mergeClipboardItem,
  type ClipboardInboxItem,
} from "@/lib/clipboard-inbox-storage";
import { sendShareUrl } from "@/lib/meet-code";
import type { RoomSession } from "@/lib/room-session";
import { pageShell, sessionInboxLayout, stackLayout, touchTarget } from "@/lib/ui";
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
  const [copiedSendLink, setCopiedSendLink] = useState(false);
  const [showSendUrl, setShowSendUrl] = useState(false);
  const [autoCopy, setAutoCopy] = useState(true);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const { members, pendingMembers } = useRoomMembers(
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

  const phoneLinked = p2p.status === "connected";
  const roomSyncEnabled =
    session.memberStatus !== "pending" && session.memberStatus !== "rejected";
  const showAssignee = members.filter((m) => m.status === "approved").length > 1;

  const persistItems = useCallback(
    (next: ClipboardInboxItem[]) => {
      setItems(next);
      saveClipboardInbox(session.topic, next);
    },
    [session.topic]
  );

  const addItem = useCallback(
    (incoming: ClipboardInboxItem) => {
      persistItems(mergeClipboardItem(itemsRef.current, incoming));
    },
    [persistItems]
  );

  const mergeRemoteItems = useCallback(
    (incoming: ClipboardInboxItem[]) => {
      if (incoming.length === 0) return;
      let next = itemsRef.current;
      for (const item of incoming) {
        next = mergeClipboardItem(next, item);
      }
      persistItems(next);
    },
    [persistItems]
  );

  const roomSync = useClipboardRoomSync({
    topic: session.topic,
    deviceFingerprint: session.deviceFingerprint,
    enabled: roomSyncEnabled,
    getItems: () => itemsRef.current,
    onUpsert: addItem,
    onMergeBatch: mergeRemoteItems,
  });

  const updateAssignee = useCallback(
    (id: string, assignee: ClipboardAssignee | null) => {
      const next = itemsRef.current.map((row) =>
        row.id === id ? { ...row, assignee } : row
      );
      persistItems(next);
      const updated = next.find((row) => row.id === id);
      if (updated) {
        roomSync.publishUpsert(updated);
      }
    },
    [persistItems, roomSync]
  );

  useEffect(() => {
    const stored = loadClipboardInbox(session.topic);
    setItems(stored);
    setHydrated(true);
  }, [session.topic]);

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
      const item = toInboxItem(
        {
          ...payload,
          source: payload.source ?? "mobile",
        },
        copiedToClipboard
      );
      addItem(item);
      roomSync.publishUpsert(item);
    },
    [autoCopy, p2p, addItem, roomSync]
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
    <div className="flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-background">
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
        phoneLinked={phoneLinked}
        pairOpen={pairOpen}
        onPairOpenChange={setPairOpen}
        sendUrl={sendUrl}
        copiedSendLink={copiedSendLink}
        onCopySendLink={() => {
          void navigator.clipboard.writeText(sendUrl);
          setCopiedSendLink(true);
          setTimeout(() => setCopiedSendLink(false), 1500);
        }}
        showSendUrl={showSendUrl}
        onToggleSendUrl={() => setShowSendUrl((v) => !v)}
        onLeave={requestLeave}
        participantsOpen={participantsOpen}
        onParticipantsOpenChange={setParticipantsOpen}
      />

      {session.isHost && (
        <HostPendingBanner
          count={pendingMembers.length}
          onReview={() => setParticipantsOpen(true)}
        />
      )}

      {autoCopiedId && (
        <div
          className="pointer-events-none fixed bottom-safe left-1/2 z-50 mx-auto flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center justify-center gap-2 rounded-full border border-accent-foreground/30 bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground shadow-none"
          role="status"
        >
          <ClipboardCheck className="size-4 shrink-0" aria-hidden />
          Copied to clipboard
        </div>
      )}

      <main
        id="session-main"
        className={cn(
          pageShell,
          stackLayout,
          "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain py-3 sm:py-6 md:py-8"
        )}
      >
        <section
          className={sessionInboxLayout}
          aria-label="Session inbox"
        >
          <div className="grid w-full min-w-0 shrink-0 grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:gap-2">
            <ClipboardCompose
              isHost={Boolean(session.isHost)}
              displayName={session.displayName}
              deviceFingerprint={session.deviceFingerprint}
              members={members}
              open={composeOpen}
              onOpenChange={setComposeOpen}
              showAssignee={showAssignee}
              className="min-w-0 w-full"
              onAdd={(item) => {
                addItem(item);
                roomSync.publishUpsert(item);
              }}
              onBroadcast={(item) => {
                if (phoneLinked) {
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                touchTarget,
                "h-11 w-full gap-1.5 px-3 sm:h-10 sm:w-auto"
              )}
              onClick={() => setAiOpen(true)}
              aria-label="Local AI assist"
            >
              <Sparkles className="size-3.5 shrink-0" aria-hidden />
              AI
            </Button>
          </div>

          <SessionAiPanel
            open={aiOpen}
            onOpenChange={setAiOpen}
            latestItem={items[0] ?? null}
          />

          {phoneLinked && (
            <label
              className={cn(
                touchTarget,
                "flex w-full shrink-0 cursor-pointer items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5"
              )}
            >
              <input
                type="checkbox"
                checked={autoCopy}
                onChange={(e) => setAutoCopy(e.target.checked)}
                className="size-4 shrink-0 rounded border-border accent-primary"
              />
              <span className="min-w-0 text-left">
                <span className="block text-sm font-medium text-foreground">
                  Auto-copy latest
                </span>
                <span className="block text-xs text-muted-foreground">
                  Paste new phone items to your system clipboard
                </span>
              </span>
            </label>
          )}

          {!hydrated ? (
            <div
              className="flex items-center justify-center py-16 text-sm text-muted-foreground"
              role="status"
            >
              Loading inbox…
            </div>
          ) : items.length === 0 ? (
            <InboxEmptyState phoneLinked={phoneLinked} />
          ) : (
            <ul
              className="flex min-h-0 flex-col gap-2 pb-safe"
              aria-label="Session clipboard items"
            >
              {items.map((item, index) => (
                <ClipboardInboxItemCard
                  key={`${item.id}-${item.at}`}
                  item={item}
                  isLatest={index === 0}
                  highlightCopy={autoCopiedId === item.id}
                  copying={copiedId === item.id}
                  members={members}
                  currentDeviceFingerprint={session.deviceFingerprint}
                  onAssigneeChange={updateAssignee}
                  onCopy={() => void copyItem(item)}
                  showAssignee={showAssignee}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
