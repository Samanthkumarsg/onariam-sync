"use client";

import { Check, Clipboard, Copy, LogOut, Smartphone } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { QrDisplay } from "@/components/qr-display";
import { OnariamLogo } from "@/components/onariam-logo";
import { ParticipantsMenu } from "@/components/participants-menu";
import { Button } from "@/components/ui/button";
import { useClipboardP2p } from "@/hooks/use-clipboard-p2p";
import { getAvatarEmoji } from "@/lib/avatars";
import type { ClipboardPayload } from "@/lib/clipboard-p2p";
import { meetShareUrl, sendShareUrl } from "@/lib/meet-code";
import type { RoomSession } from "@/lib/room-session";
import { btnGhost, chip, panel } from "@/lib/ui";
import { cn } from "@/lib/utils";

type ReceivedItem = ClipboardPayload & { id: string };

type Props = {
  session: RoomSession;
  onLeave: () => void;
};

function statusLabel(
  status: ReturnType<typeof useClipboardP2p>["status"]
): string {
  switch (status) {
    case "waiting":
      return "Scan QR with your phone";
    case "connecting":
      return "Connecting…";
    case "connected":
      return "Connected — send from phone";
    case "failed":
      return "Connection failed";
    default:
      return "Starting…";
  }
}

export function ClipboardSyncShell({ session, onLeave }: Props) {
  const avatar = getAvatarEmoji(session.avatarId);
  const sendUrl = useMemo(
    () => sendShareUrl(session.topic),
    [session.topic]
  );

  const [items, setItems] = useState<ReceivedItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [autoCopy, setAutoCopy] = useState(true);

  const p2p = useClipboardP2p({
    code: session.topic,
    role: "desktop",
    localId: session.deviceFingerprint,
  });

  const handleReceive = useCallback(
    (payload: ClipboardPayload) => {
      const id = `${payload.at}-${Math.random().toString(36).slice(2, 8)}`;
      setItems((prev) => [{ ...payload, id }, ...prev].slice(0, 50));
      if (autoCopy && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(payload.text);
      }
    },
    [autoCopy]
  );

  useEffect(() => {
    p2p.onReceive(handleReceive);
  }, [p2p, handleReceive]);

  const copyItem = async (item: ReceivedItem) => {
    try {
      await navigator.clipboard.writeText(item.text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header
        className={cn(
          panel,
          "z-40 flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 sm:px-4"
        )}
      >
        <OnariamLogo size="sm" />
        <span className="text-lg leading-none" aria-hidden>
          {avatar}
        </span>
        <code className={cn(chip, "max-w-[140px] truncate sm:max-w-none")}>
          {session.topic}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(meetShareUrl(session.topic));
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 1500);
          }}
          className={btnGhost}
        >
          {copiedLink ? "Copied" : "Copy link"}
        </button>
        <ParticipantsMenu
          topic={session.topic}
          deviceFingerprint={session.deviceFingerprint}
          currentDeviceFingerprint={session.deviceFingerprint}
        />
        <span className="text-muted-foreground/40">·</span>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {session.displayName}
        </span>
        <div className="min-w-2 flex-1" />
        <Button type="button" variant="ghost" size="sm" onClick={onLeave}>
          <LogOut className="size-4" aria-hidden />
          Leave
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 p-6 md:flex-row md:p-10">
        <section
          className={cn(panel, "flex flex-col items-center gap-4 p-6 md:w-72")}
          aria-label="Pair phone"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Smartphone className="size-4 text-primary" aria-hidden />
            Scan to send
          </div>
          <QrDisplay url={sendUrl} size={200} className="rounded-lg" />
          <p className="text-center font-mono text-[11px] text-muted-foreground break-all">
            {sendUrl}
          </p>
          <p
            className={cn(
              "text-center text-sm",
              p2p.status === "connected"
                ? "text-emerald-500"
                : p2p.status === "failed"
                  ? "text-destructive"
                  : "text-muted-foreground"
            )}
          >
            {p2p.error ?? statusLabel(p2p.status)}
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Peer-to-peer only. Clipboard text is not stored on our servers —
            Supabase is used briefly for connection setup.
          </p>
        </section>

        <section className="flex min-h-0 flex-1 flex-col gap-4" aria-label="Received">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-semibold tracking-tight">
              Universal clipboard
            </h1>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={autoCopy}
                onChange={(e) => setAutoCopy(e.target.checked)}
                className="size-4 rounded border-border accent-primary"
              />
              Auto-copy latest
            </label>
          </div>

          {items.length === 0 ? (
            <div
              className={cn(
                panel,
                "flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center text-muted-foreground"
              )}
            >
              <Clipboard className="size-10 opacity-40" aria-hidden />
              <p className="text-sm">
                Paste or type on your phone, then tap Send. Content appears here.
              </p>
            </div>
          ) : (
            <ul className="flex flex-1 flex-col gap-3 overflow-y-auto">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={cn(panel, "flex flex-col gap-2 p-4")}
                >
                  <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                    {item.text}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={new Date(item.at).toISOString()}
                    >
                      {new Date(item.at).toLocaleTimeString()}
                    </time>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void copyItem(item)}
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="size-3.5" aria-hidden />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" aria-hidden />
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
