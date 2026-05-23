"use client";

import {
  Check,
  ClipboardPaste,
  Loader2,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { OnariamLogo } from "@/components/onariam-logo";
import { WaitingForHost } from "@/components/waiting-for-host";
import { Button } from "@/components/ui/button";
import { useClipboardP2p } from "@/hooks/use-clipboard-p2p";
import { useDeviceId } from "@/hooks/use-device-id";
import { formatMeetCode, isValidMeetCode } from "@/lib/meet-code";
import {
  getMyMembership,
  joinMeeting,
  type MemberStatus,
} from "@/lib/meetings";
import { input, panel } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  code: string;
};

type SendState = "idle" | "sent" | "delivered" | "copied";

export function ClipboardSender({ code }: Props) {
  const formatted = formatMeetCode(code);
  const valid = isValidMeetCode(formatted);
  const { deviceId, ready } = useDeviceId();
  const textareaId = useId();

  const [text, setText] = useState("");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [memberStatus, setMemberStatus] = useState<MemberStatus | null>(null);
  const [displayName, setDisplayName] = useState("Guest");
  const [joinError, setJoinError] = useState<string | null>(null);

  const approved = memberStatus === "approved";
  const p2p = useClipboardP2p({
    code: formatted,
    role: "mobile",
    localId: deviceId ? `mobile-${deviceId}` : "mobile-anon",
    enabled: valid && ready && approved,
  });

  useEffect(() => {
    if (!valid || !ready || !deviceId) return;

    let cancelled = false;

    (async () => {
      try {
        const m = await joinMeeting(formatted, deviceId);
        if (cancelled) return;
        setDisplayName(m.display_name);
        setMemberStatus(m.member_status);
        if (m.member_status === "rejected") {
          setJoinError("The host declined your request to join.");
        }
      } catch {
        if (!cancelled) setJoinError("Could not join session");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [formatted, valid, ready, deviceId]);

  useEffect(() => {
    if (memberStatus !== "pending" || !deviceId) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const m = await getMyMembership(formatted, deviceId);
        if (cancelled) return;
        setMemberStatus(m.member_status);
        if (m.member_status === "rejected") {
          setJoinError("The host declined your request to join.");
        }
      } catch {
        /* keep polling */
      }
    };

    const id = setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [memberStatus, deviceId, formatted]);

  useEffect(() => {
    p2p.onAck((ack) => {
      if (ack.id !== lastMessageId) return;
      if (ack.copied) setSendState("copied");
      else setSendState("delivered");
    });
  }, [p2p, lastMessageId]);

  const pasteFromSystem = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) setText((prev) => (prev ? `${prev}\n${clip}` : clip));
    } catch {
      /* permission denied or unsupported */
    }
  };

  const handleSend = useCallback(() => {
    const payload = p2p.sendText(text);
    if (!payload) return;
    setLastMessageId(payload.id);
    setSendState("sent");
    setText("");
    setTimeout(() => {
      setSendState((s) => (s === "sent" ? "delivered" : s));
    }, 800);
  }, [p2p, text]);

  if (!valid) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-safe py-6 text-center">
        <p className="text-sm text-destructive">Invalid session code.</p>
      </main>
    );
  }

  if (joinError) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-safe py-6 text-center">
        <p className="text-sm text-destructive">{joinError}</p>
      </main>
    );
  }

  if (memberStatus === null) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-safe text-sm text-muted-foreground">
        Joining session…
      </main>
    );
  }

  if (memberStatus === "pending") {
    return (
      <WaitingForHost
        topic={formatted}
        displayName={displayName}
        onLeave={() => {
          window.history.length > 1
            ? window.history.back()
            : (window.location.href = "/");
        }}
      />
    );
  }

  const statusText =
    p2p.status === "connected"
      ? sendState === "copied"
        ? "Copied on desktop"
        : sendState === "delivered"
          ? "Delivered to desktop"
          : sendState === "sent"
            ? "Sent"
            : "Connected — send to desktop"
      : p2p.status === "connecting"
        ? "Connecting to desktop…"
        : p2p.status === "failed"
          ? (p2p.error ?? "Connection failed")
          : "Open the sync page on your computer first, then send";

  const sendLabel =
    sendState === "copied"
      ? "Copied on desktop"
      : sendState === "delivered"
        ? "Delivered"
        : sendState === "sent"
          ? "Sent"
          : "Send to browser";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="shrink-0 border-b border-border pt-safe">
        <div className="flex items-center justify-center px-safe py-3 sm:py-4">
          <OnariamLogo href={null} size="sm" />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col px-safe">
        <div className="shrink-0 py-4 text-center">
          <p className="font-mono text-xs text-muted-foreground sm:text-sm">
            {formatted}
          </p>
          <p
            className={cn(
              "mt-2 text-sm",
              sendState === "copied" || p2p.status === "connected"
                ? "text-emerald-500"
                : p2p.status === "failed"
                  ? "text-destructive"
                  : "text-muted-foreground"
            )}
          >
            {statusText}
          </p>
          {sendState === "copied" && (
            <p className="mt-1 flex items-center justify-center gap-1 text-xs text-emerald-500">
              <Check className="size-3.5 shrink-0" aria-hidden />
              Desktop copied to clipboard
            </p>
          )}
        </div>

        <div
          className={cn(
            panel,
            "flex min-h-0 flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4"
          )}
        >
          <label htmlFor={textareaId} className="shrink-0 text-sm font-medium">
            Paste or type
          </label>
          <textarea
            id={textareaId}
            className={cn(
              input,
              "min-h-[min(12rem,40dvh)] flex-1 resize-none font-sans text-base leading-relaxed sm:min-h-[200px] sm:resize-y"
            )}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Links, notes, codes…"
            autoComplete="off"
            enterKeyHint="send"
          />

          <div className="sticky bottom-0 -mx-3 shrink-0 border-t border-border bg-card px-3 pb-safe pt-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full touch-manipulation sm:h-10"
                onClick={() => void pasteFromSystem()}
              >
                <ClipboardPaste className="size-4 shrink-0" aria-hidden />
                Paste from clipboard
              </Button>
              <Button
                type="button"
                className="h-12 w-full touch-manipulation sm:h-10"
                disabled={
                  !text.trim() ||
                  p2p.status !== "connected" ||
                  !ready
                }
                onClick={handleSend}
              >
                {p2p.status === "connecting" ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                ) : sendState === "copied" ? (
                  <Check className="size-4 shrink-0" aria-hidden />
                ) : (
                  <Send className="size-4 shrink-0" aria-hidden />
                )}
                {sendLabel}
              </Button>
            </div>
          </div>
        </div>

        <p className="shrink-0 py-4 text-center text-xs leading-relaxed text-muted-foreground pb-safe">
          Transfers go directly to your computer (peer-to-peer). Nothing is saved
          on our servers.
        </p>
      </div>
    </div>
  );
}
