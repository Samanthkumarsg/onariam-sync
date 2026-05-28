"use client";

import { Check, Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ClipboardEditor,
  type ClipboardEditorValue,
} from "@/components/clipboard-editor";
import { JoinSessionProfile } from "@/components/join-session-profile";
import { OnariamLogo } from "@/components/onariam-logo";
import { WaitingForHost } from "@/components/waiting-for-host";
import { Button } from "@/components/ui/button";
import { useClipboardP2p } from "@/hooks/use-clipboard-p2p";
import { useDeviceId } from "@/hooks/use-device-id";
import type { AvatarId } from "@/lib/avatars";
import {
  sendButtonLabel,
  sendScreenCopy,
  sendStatusLine,
} from "@/lib/hook-copy";
import { haptic } from "@/lib/haptic";
import { formatMeetCode, isValidMeetCode } from "@/lib/meet-code";
import { needsJoinProfile } from "@/lib/join-profile";
import { getRoomSession, saveRoomSession } from "@/lib/room-session";
import {
  getMyMembership,
  joinMeeting,
  type MemberStatus,
} from "@/lib/meetings";
import { pageShell, panel, stackLayout, touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  code: string;
};

type SendState = "idle" | "sent" | "delivered" | "copied";

export function ClipboardSender({ code }: Props) {
  const formatted = formatMeetCode(code);
  const valid = isValidMeetCode(formatted);
  const { deviceId, ready } = useDeviceId();

  const [draft, setDraft] = useState<ClipboardEditorValue>({
    html: "",
    text: "",
  });
  const [editorKey, setEditorKey] = useState(0);
  const [editorSeed, setEditorSeed] = useState("");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [memberStatus, setMemberStatus] = useState<MemberStatus | null>(null);
  const [displayName, setDisplayName] = useState("Guest");
  const [avatarId, setAvatarId] = useState<AvatarId>("fox");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [profileReady, setProfileReady] = useState(false);

  const approved = memberStatus === "approved";
  const showProfileGate =
    valid &&
    ready &&
    deviceId &&
    !profileReady &&
    needsJoinProfile(formatted, getRoomSession());
  const p2p = useClipboardP2p({
    code: formatted,
    role: "mobile",
    localId: deviceId ? `mobile-${deviceId}` : "mobile-anon",
    enabled: valid && ready && approved,
  });

  useEffect(() => {
    if (!valid || !ready || !deviceId) return;
    if (needsJoinProfile(formatted, getRoomSession())) return;
    setProfileReady(true);
  }, [formatted, valid, ready, deviceId]);

  useEffect(() => {
    if (!profileReady || !valid || !ready || !deviceId) return;

    let cancelled = false;

    (async () => {
      try {
        const stored = getRoomSession();
        const m = await joinMeeting(
          formatted,
          deviceId,
          stored?.displayName ?? displayName,
          stored?.avatarId ?? avatarId
        );
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
  }, [formatted, valid, ready, deviceId, profileReady, displayName, avatarId]);

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

  const prevSendStateRef = useRef<SendState>("idle");
  const connectedHapticRef = useRef(false);

  useEffect(() => {
    p2p.onAck((ack) => {
      if (ack.id !== lastMessageId) return;
      if (ack.copied) setSendState("copied");
      else setSendState("delivered");
    });
  }, [p2p, lastMessageId]);

  useEffect(() => {
    if (p2p.status === "connected" && !connectedHapticRef.current) {
      connectedHapticRef.current = true;
      haptic("light");
    }
    if (p2p.status !== "connected") {
      connectedHapticRef.current = false;
    }
  }, [p2p.status]);

  useEffect(() => {
    const prev = prevSendStateRef.current;
    prevSendStateRef.current = sendState;
    if (prev === sendState) return;
    if (sendState === "delivered") haptic("success");
    if (sendState === "copied") haptic("celebrate");
  }, [sendState]);

  const pasteFromSystem = useCallback(async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip) return;
      const html = `<p>${clip
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>")}</p>`;
      setDraft({ text: clip, html });
      setEditorSeed(html);
      setEditorKey((k) => k + 1);
    } catch {
      /* permission denied or unsupported */
    }
  }, []);

  const handleSend = useCallback(() => {
    const payload = p2p.sendPayload(draft.text, {
      html: draft.html,
      source: "mobile",
      author: displayName,
    });
    if (!payload) return;
    haptic("light");
    setLastMessageId(payload.id);
    setSendState("sent");
    setDraft({ html: "", text: "" });
    setEditorSeed("");
    setEditorKey((k) => k + 1);
    setTimeout(() => {
      setSendState((s) => (s === "sent" ? "delivered" : s));
    }, 800);
  }, [p2p, draft, displayName]);

  if (!valid) {
    return (
      <main className="flex min-h-dvh min-w-0 flex-col items-center justify-center gap-4 overflow-x-hidden px-safe py-6 text-center">
        <p className="text-sm text-destructive">Invalid session code.</p>
      </main>
    );
  }

  if (showProfileGate) {
    return (
      <main className="flex min-h-dvh min-w-0 flex-col items-center justify-center overflow-x-hidden px-safe py-6">
        <JoinSessionProfile
          className="w-full"
          code={formatted}
          title="Send from phone"
          subtitle="Name and icon for this session."
          submitLabel="Continue"
          onSubmit={({ name, avatarId: picked }) => {
            if (!deviceId) return;
            setAvatarId(picked);
            saveRoomSession({
              topic: formatted,
              title: "Session",
              displayName: name.trim() || `Guest ${deviceId.slice(-4)}`,
              deviceFingerprint: deviceId,
              avatarId: picked,
              isHost: false,
              memberStatus: "pending",
            });
            setDisplayName(name.trim() || `Guest ${deviceId.slice(-4)}`);
            setProfileReady(true);
          }}
        />
      </main>
    );
  }

  if (joinError) {
    return (
      <main className="flex min-h-dvh min-w-0 flex-col items-center justify-center gap-4 overflow-x-hidden px-safe py-6 text-center">
        <p className="text-sm text-destructive">{joinError}</p>
      </main>
    );
  }

  if (memberStatus === null) {
    return (
      <main className="flex min-h-dvh min-w-0 items-center justify-center overflow-x-hidden px-safe text-sm text-muted-foreground">
        {sendScreenCopy.joining}
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

  const statusText = sendStatusLine(p2p.status, sendState, p2p.error);
  const sendLabel = sendButtonLabel(sendState);

  return (
    <div className="flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b border-border pt-safe">
        <div className="flex items-center justify-center px-safe py-3 sm:py-4">
          <OnariamLogo href={null} size="sm" />
        </div>
      </header>

      <div
        className={cn(
          pageShell,
          stackLayout,
          "flex min-h-0 w-full min-w-0 max-w-lg flex-1 overflow-y-auto overscroll-y-contain py-3 sm:py-6"
        )}
      >
        <div className="shrink-0 space-y-1 text-center">
          <p className="font-mono text-xs text-muted-foreground">{formatted}</p>
          <h1 className="text-base font-medium text-foreground">
            {sendScreenCopy.title}
          </h1>
          <p
            className={cn(
              "mt-2 text-sm",
              sendState === "copied" || p2p.status === "connected"
                ? "text-accent-foreground"
                : p2p.status === "failed"
                  ? "text-destructive"
                  : "text-muted-foreground"
            )}
          >
            {statusText}
          </p>
        </div>

        <div
          className={cn(
            panel,
            "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-0 sm:overflow-visible"
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 pt-3 sm:overflow-visible sm:px-4 sm:pt-4">
            <p className="shrink-0 text-sm font-medium">{sendScreenCopy.pasteLabel}</p>
            <div className="min-h-0 shrink-0 pb-2">
              <ClipboardEditor
                key={editorKey}
                initialContent={editorSeed}
                placeholder={sendScreenCopy.placeholder}
                minHeightClassName="min-h-[min(12rem,40dvh)] sm:min-h-[200px]"
                onChange={setDraft}
                onPasteFromClipboard={() => void pasteFromSystem()}
                disabled={p2p.status !== "connected" || !ready}
              />
            </div>
          </div>

          <div className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-card px-3 pb-safe pt-3 sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:px-4 sm:pb-0">
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className={cn(
                  touchTarget,
                  "h-12 w-full",
                  (sendState === "copied" || sendState === "delivered") &&
                    "motion-safe:animate-hook-reward"
                )}
                disabled={
                  !draft.text.trim() ||
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
      </div>
    </div>
  );
}
