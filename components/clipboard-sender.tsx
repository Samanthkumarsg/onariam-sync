"use client";

import { Check, Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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

  useEffect(() => {
    p2p.onAck((ack) => {
      if (ack.id !== lastMessageId) return;
      if (ack.copied) setSendState("copied");
      else setSendState("delivered");
    });
  }, [p2p, lastMessageId]);

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
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-safe py-6 text-center">
        <p className="text-sm text-destructive">Invalid session code.</p>
      </main>
    );
  }

  if (showProfileGate) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-safe py-6">
        <JoinSessionProfile
          code={formatted}
          title="Join from phone"
          subtitle="Your name and icon appear in the session for the host."
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
          : "Desktop not linked — open the sync page on your computer, then send";

  const sendLabel =
    sendState === "copied"
      ? "Copied on desktop"
      : sendState === "delivered"
        ? "Delivered"
        : sendState === "sent"
          ? "Sent"
          : "Send to browser";

  return (
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-hidden bg-background">
      <header className="shrink-0 border-b border-border pt-safe">
        <div className="flex items-center justify-center px-safe py-3 sm:py-4">
          <OnariamLogo href={null} size="sm" />
        </div>
      </header>

      <div className={cn(pageShell, stackLayout, "max-w-lg flex-1 py-4 sm:py-6")}>
        <div className="shrink-0 space-y-1 text-center">
          <p className="font-mono text-xs text-muted-foreground">{formatted}</p>
          <h1 className="text-base font-medium text-foreground">Send to desktop</h1>
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
          {sendState === "copied" && (
            <p className="mt-1 flex items-center justify-center gap-1 text-xs text-accent-foreground">
              <Check className="size-3.5 shrink-0" aria-hidden />
              Desktop copied to clipboard
            </p>
          )}
        </div>

        <div
          className={cn(
            panel,
            "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-0"
          )}
        >
          <p className="shrink-0 px-3 pt-3 text-sm font-medium sm:px-4 sm:pt-4">
            Paste or type
          </p>
          <div className="min-h-0 flex-1 px-3 sm:px-4">
            <ClipboardEditor
              key={editorKey}
              initialContent={editorSeed}
              placeholder="Links, notes, codes…"
              minHeightClassName="min-h-[min(12rem,40dvh)] sm:min-h-[200px]"
              onChange={setDraft}
              onPasteFromClipboard={() => void pasteFromSystem()}
              disabled={p2p.status !== "connected" || !ready}
            />
          </div>

          <div className="sticky bottom-0 shrink-0 border-t border-border bg-card px-3 pb-safe pt-3 sm:static sm:border-0 sm:bg-transparent sm:px-4 sm:pb-0">
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className={cn(touchTarget, "h-12 w-full")}
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

        <p className="shrink-0 py-4 text-center text-xs leading-relaxed text-muted-foreground pb-safe">
          Transfers go directly to your computer (peer-to-peer). Nothing is saved
          on our servers.
        </p>
      </div>
    </div>
  );
}
