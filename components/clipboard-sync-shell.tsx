"use client";

import {
  Check,
  Clipboard,
  ClipboardCheck,
  Copy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LeaveSessionDialog } from "@/components/leave-session-dialog";
import { SessionToolbar } from "@/components/session-toolbar";
import { Button } from "@/components/ui/button";
import { useClipboardP2p } from "@/hooks/use-clipboard-p2p";
import type { ClipboardPayload } from "@/lib/clipboard-p2p";
import { meetShareUrl, sendShareUrl } from "@/lib/meet-code";
import type { RoomSession } from "@/lib/room-session";
import { eyebrow, panel, subhead } from "@/lib/ui";
import { cn } from "@/lib/utils";

type ReceivedItem = ClipboardPayload & {
  copiedToClipboard: boolean;
};

type Props = {
  session: RoomSession;
  onLeave: () => void;
};

function downloadClipboardItems(items: ReceivedItem[], topic: string) {
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

export function ClipboardSyncShell({ session, onLeave }: Props) {
  const sendUrl = useMemo(
    () => sendShareUrl(session.topic),
    [session.topic]
  );

  const [items, setItems] = useState<ReceivedItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [autoCopiedId, setAutoCopiedId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSendLink, setCopiedSendLink] = useState(false);
  const [showSendUrl, setShowSendUrl] = useState(false);
  const [showQr, setShowQr] = useState(true);
  const [autoCopy, setAutoCopy] = useState(true);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const p2p = useClipboardP2p({
    code: session.topic,
    role: "desktop",
    localId: session.deviceFingerprint,
  });

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
      setItems((prev) =>
        [{ ...payload, copiedToClipboard }, ...prev].slice(0, 50)
      );
    },
    [autoCopy, p2p]
  );

  useEffect(() => {
    p2p.onReceive((payload) => {
      void handleReceive(payload);
    });
  }, [p2p, handleReceive]);

  const copyItem = async (item: ReceivedItem) => {
    try {
      await navigator.clipboard.writeText(item.text);
      setCopiedId(item.id);
      setItems((prev) =>
        prev.map((row) =>
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

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <LeaveSessionDialog
        open={leaveOpen}
        itemCount={items.length}
        onSave={() => {
          downloadClipboardItems(items, session.topic);
          onLeave();
        }}
        onErase={() => onLeave()}
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

      <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-safe py-4 sm:px-6 sm:py-6 md:py-8">
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
                {items.length === 0
                  ? "Received text appears here in real time."
                  : `${items.length} item${items.length === 1 ? "" : "s"} this session`}
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

          {items.length === 0 ? (
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
                  Tap{" "}
                  <button
                    type="button"
                    onClick={() => setShowQr(true)}
                    className="font-medium text-primary underline-offset-2 touch-manipulation hover:underline"
                  >
                    QR
                  </button>{" "}
                  in the header to pair your phone, then send from the mobile
                  page.
                </p>
              </div>
            </div>
          ) : (
            <ul
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pb-safe [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
              aria-label="Received clipboard items"
            >
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className={cn(
                    panel,
                    "flex flex-col gap-3 p-3.5 transition-shadow sm:p-5",
                    index === 0 && "border-primary/25 ring-1 ring-primary/15",
                    autoCopiedId === item.id && "ring-2 ring-emerald-500/40"
                  )}
                >
                  {index === 0 && (
                    <span className="w-fit rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Latest
                    </span>
                  )}
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground sm:text-[15px]">
                    {item.text}
                  </p>
                  <div className="flex flex-col gap-3 border-t border-border/80 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1">
                      <time
                        className="text-xs tabular-nums text-muted-foreground"
                        dateTime={new Date(item.at).toISOString()}
                      >
                        {new Date(item.at).toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </time>
                      {item.copiedToClipboard && (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                          <ClipboardCheck className="size-3.5 shrink-0" aria-hidden />
                          In your clipboard
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant={copiedId === item.id ? "secondary" : "outline"}
                      size="sm"
                      className="h-11 w-full touch-manipulation sm:h-9 sm:min-w-[5.5rem] sm:w-auto"
                      onClick={() => void copyItem(item)}
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="size-4 shrink-0" aria-hidden />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-4 shrink-0" aria-hidden />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
