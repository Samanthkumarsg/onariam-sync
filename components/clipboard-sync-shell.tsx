"use client";

import { ClipboardCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ClipboardCompose } from "@/components/clipboard-compose";
import { ClipboardBoardItemCard } from "@/components/clipboard-board-item";
import { BoardEmptyState } from "@/components/board-empty-state";
import { SessionToast } from "@/components/session-toast";
import { LeaveSessionDialog } from "@/components/leave-session-dialog";
import { SessionToolbar } from "@/components/session-toolbar";
import { useClipboardP2p } from "@/hooks/use-clipboard-p2p";
import { useClipboardRoomSync } from "@/hooks/use-clipboard-room-sync";
import { useRoomMembers } from "@/hooks/use-room-members";
import type { ClipboardAssignee } from "@/lib/clipboard-assignee";
import type { ClipboardPayload } from "@/lib/clipboard-p2p";
import {
  clearClipboardBoard,
  loadClipboardBoard,
  saveClipboardBoard,
  mergeClipboardItem,
  type ClipboardBoardItem,
} from "@/lib/clipboard-inbox-storage";
import {
  formatPhoneInviteClipboard,
  hostToast,
  rewardToast,
} from "@/lib/hook-copy";
import { sendShareUrl } from "@/lib/meet-code";
import type { RoomSession } from "@/lib/room-session";
import { pageShell, sessionBoardLayout, stackLayout, touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  session: RoomSession;
  onLeave: () => void;
};

function downloadClipboardItems(items: ClipboardBoardItem[], topic: string) {
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

function toBoardItem(
  payload: ClipboardPayload,
  copiedToClipboard = false
): ClipboardBoardItem {
  return { ...payload, copiedToClipboard };
}

export function ClipboardSyncShell({ session, onLeave }: Props) {
  const sendUrl = useMemo(
    () => sendShareUrl(session.topic),
    [session.topic]
  );

  const [items, setItems] = useState<ClipboardBoardItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [autoCopiedId, setAutoCopiedId] = useState<string | null>(null);
  const [quickPasted, setQuickPasted] = useState(false);
  const [copiedSendLink, setCopiedSendLink] = useState(false);
  const [showSendUrl, setShowSendUrl] = useState(false);
  const [autoCopy, setAutoCopy] = useState(true);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [hostToastMsg, setHostToastMsg] = useState<string | null>(null);
  const prevPendingCountRef = useRef(0);

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

  useEffect(() => {
    if (!session.isHost) {
      setHostToastMsg(null);
      return;
    }
    const n = pendingMembers.length;
    if (n > 0 && n >= prevPendingCountRef.current) {
      setHostToastMsg(hostToast.pending(n));
    } else if (n === 0) {
      setHostToastMsg(null);
    }
    prevPendingCountRef.current = n;
  }, [pendingMembers.length, session.isHost]);

  const copyPhoneInviteLink = useCallback(() => {
    void navigator.clipboard.writeText(
      formatPhoneInviteClipboard(sendUrl, session.topic)
    );
    setCopiedSendLink(true);
    setTimeout(() => setCopiedSendLink(false), 2500);
  }, [sendUrl, session.topic]);
  const roomSyncEnabled =
    session.memberStatus !== "pending" && session.memberStatus !== "rejected";
  const showAssignee = members.filter((m) => m.status === "approved").length > 1;

  const persistItems = useCallback(
    (next: ClipboardBoardItem[]) => {
      setItems(next);
      saveClipboardBoard(session.topic, next);
    },
    [session.topic]
  );

  const addItem = useCallback(
    (incoming: ClipboardBoardItem) => {
      persistItems(mergeClipboardItem(itemsRef.current, incoming));
    },
    [persistItems]
  );

  const mergeRemoteItems = useCallback(
    (incoming: ClipboardBoardItem[]) => {
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
    const stored = loadClipboardBoard(session.topic);
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
      const item = toBoardItem(
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

  const copyItem = async (item: ClipboardBoardItem) => {
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
    clearClipboardBoard(session.topic);
    onLeave();
  };

  return (
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-hidden bg-background">
      <LeaveSessionDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        itemCount={items.length}
        onSave={() => {
          downloadClipboardItems(items, session.topic);
          onLeave();
        }}
        onErase={handleEraseLeave}
      />

      <SessionToolbar
        session={session}
        phoneLinked={phoneLinked}
        pairOpen={pairOpen}
        onPairOpenChange={setPairOpen}
        sendUrl={sendUrl}
        copiedSendLink={copiedSendLink}
        onCopySendLink={copyPhoneInviteLink}
        onHostToast={(msg) => {
          setHostToastMsg(msg);
          setTimeout(() => setHostToastMsg(null), 3200);
        }}
        showSendUrl={showSendUrl}
        onToggleSendUrl={() => setShowSendUrl((v) => !v)}
        onLeave={requestLeave}
        participantsOpen={participantsOpen}
        onParticipantsOpenChange={setParticipantsOpen}
      />

      <SessionToast
        message={session.isHost ? hostToastMsg : null}
        onDismiss={() => {
          setParticipantsOpen(true);
        }}
      />

      {(autoCopiedId || quickPasted) && (
        <div
          className="pointer-events-none fixed bottom-safe left-1/2 z-50 mx-auto flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-none"
          role="status"
        >
          <ClipboardCheck className="size-4 shrink-0" aria-hidden />
          {quickPasted
            ? rewardToast.addedToBoard
            : rewardToast.copiedToClipboard}
        </div>
      )}

      <main
        id="session-main"
        className={cn(
          pageShell,
          stackLayout,
          "flex-1 py-3 sm:py-6 md:py-8"
        )}
      >
        <section
          className={sessionBoardLayout}
          aria-labelledby="session-board-heading"
        >
          <header className="flex shrink-0 items-baseline justify-between gap-2">
            <h2
              id="session-board-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Board
            </h2>
            {hydrated && items.length > 0 ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            ) : null}
          </header>

          {phoneLinked && (
            <label
              className={cn(
                touchTarget,
                "flex w-full shrink-0 cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
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
              className="flex flex-1 items-center justify-center py-16 text-sm text-muted-foreground"
              role="status"
            >
              Loading board…
            </div>
          ) : items.length === 0 ? (
            <BoardEmptyState
              className="min-h-0 flex-1"
              phoneLinked={phoneLinked}
              topic={session.topic}
              sendUrl={sendUrl}
              copiedSendLink={copiedSendLink}
              onCopySendLink={copyPhoneInviteLink}
              showSendUrl={showSendUrl}
              onToggleSendUrl={() => setShowSendUrl((v) => !v)}
            />
          ) : (
            <ul
              className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pb-24 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] sm:pb-8"
              aria-label="Session board items"
            >
              {items.map((item, index) => (
                <ClipboardBoardItemCard
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

      <ClipboardCompose
        isHost={Boolean(session.isHost)}
        displayName={session.displayName}
        avatarId={session.avatarId}
        deviceFingerprint={session.deviceFingerprint}
        members={members}
        open={composeOpen}
        onOpenChange={setComposeOpen}
        showAssignee={showAssignee}
        floatingFab
        onQuickPaste={() => {
          setQuickPasted(true);
          setTimeout(() => setQuickPasted(false), 2200);
        }}
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
              authorAvatar: item.authorAvatar,
              authorDeviceFingerprint: item.authorDeviceFingerprint,
              assignee: item.assignee,
              id: item.id,
              at: item.at,
            });
          }
        }}
      />
    </div>
  );
}
