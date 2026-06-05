"use client";

import { Check, Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  ClipboardEditor,
  type ClipboardEditorValue,
} from "@/components/clipboard-editor";
import { FileAttachButton } from "@/components/file-attach-button";
import { JoinSessionProfile } from "@/components/join-session-profile";
import { OnariamLogo } from "@/components/onariam-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { WaitingForHost } from "@/components/waiting-for-host";
import { Button } from "@/components/ui/button";
import { useClipboardP2p } from "@/hooks/use-clipboard-p2p";
import { useDeviceId } from "@/hooks/use-device-id";
import type { AvatarId } from "@/lib/avatars";
import { getAvatarEmoji } from "@/lib/avatars";
import { createClipboardFilePayload } from "@/lib/clipboard-p2p";
import { textToEscapedHtml } from "@/lib/clipboard-html";
import { readSystemClipboardText } from "@/lib/clipboard-read";
import type { IpfsFileMeta } from "@/lib/ipfs";
import { formatMeetCode, isValidMeetCode } from "@/lib/meet-code";
import { needsJoinProfile } from "@/lib/join-profile";
import { getRoomSession, saveRoomSession } from "@/lib/room-session";
import {
  getMyMembership,
  joinMeeting,
  type MemberStatus,
} from "@/lib/meetings";
import {
  sendButtonLabel,
  sendScreenCopy,
  sendStatusLine,
} from "@/lib/hook-copy";
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
  const [fileError, setFileError] = useState<string | null>(null);

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
    const clip = await readSystemClipboardText();
    if (!clip) return;
    const html = textToEscapedHtml(clip);
    setDraft({ text: clip, html });
    setEditorSeed(html);
    setEditorKey((k) => k + 1);
  }, []);

  const markSent = useCallback((id: string) => {
    setLastMessageId(id);
    setSendState("sent");
    setTimeout(() => {
      setSendState((s) => (s === "sent" ? "delivered" : s));
    }, 800);
  }, []);

  const handleSend = useCallback(() => {
    const payload = p2p.sendPayload(draft.text, {
      html: draft.html,
      source: "mobile",
      author: displayName,
      authorAvatar: getAvatarEmoji(avatarId),
      authorDeviceFingerprint: deviceId ?? undefined,
    });
    if (!payload) return;
    markSent(payload.id);
    setDraft({ html: "", text: "" });
    setEditorSeed("");
    setEditorKey((k) => k + 1);
  }, [p2p, draft, displayName, avatarId, deviceId, markSent]);

  const handleFileReady = useCallback(
    (file: IpfsFileMeta) => {
      setFileError(null);
      const payload = p2p.sendClipboardPayload(
        createClipboardFilePayload(file, {
          source: "mobile",
          author: displayName,
          authorAvatar: getAvatarEmoji(avatarId),
          authorDeviceFingerprint: deviceId ?? undefined,
        })
      );
      if (!payload) return;
      markSent(payload.id);
    },
    [p2p, displayName, avatarId, deviceId, markSent]
  );

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
              memberStatus: "approved",
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
            : "Connected — paste below and send"
      : sendStatusLine(p2p.status, sendState, p2p.error);

  const sendLabel = sendButtonLabel(sendState);
  const showSpinner = p2p.status === "connecting";
  const connected = p2p.status === "connected";
  const canSend = connected && Boolean(draft.text.trim()) && ready;

  return (
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-hidden bg-background">
      <header className="relative z-50 shrink-0 border-b border-border bg-card pt-safe">
        <div
          className={cn(
            pageShell,
            "flex min-h-12 items-center justify-between gap-2 py-2"
          )}
        >
          <OnariamLogo href={null} size="sm" compact className="shrink-0" />
          <span className="min-w-0 flex-1 truncate text-center font-mono text-xs text-muted-foreground">
            {formatted}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              p2p.status === "connected"
                ? "bg-accent text-accent-foreground"
                : p2p.status === "connecting"
                  ? "bg-muted text-muted-foreground"
                  : p2p.status === "failed"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-surface-elevated text-muted-foreground"
            )}
            role="status"
          >
            {p2p.status === "connected"
              ? "Linked"
              : p2p.status === "connecting"
                ? "Linking"
                : p2p.status === "failed"
                  ? "Error"
                  : "Waiting for desktop"}
            </span>
          </div>
        </div>
      </header>

      <div
        className={cn(
          pageShell,
          stackLayout,
          "flex w-full min-w-0 max-w-lg flex-1 py-3 sm:py-6"
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
            "flex min-h-0 flex-1 flex-col gap-3 p-0"
          )}
        >
          <p className="shrink-0 px-3 pt-3 text-sm font-medium sm:px-4 sm:pt-4">
            {sendScreenCopy.pasteLabel}
          </p>
          <div className="min-h-0 flex-1 px-3 sm:px-4">
            <ClipboardEditor
              key={editorKey}
              initialContent={editorSeed}
              placeholder="Links, notes, codes…"
              minHeightClassName="min-h-[min(12rem,40dvh)] sm:min-h-[200px]"
              onChange={setDraft}
              onPasteFromClipboard={() => void pasteFromSystem()}
            />
          </div>

          <div className="sticky bottom-0 shrink-0 border-t border-border bg-card px-3 pb-safe pt-3 sm:static sm:border-0 sm:bg-transparent sm:px-4 sm:pb-0">
            <div className="flex flex-col gap-2">
              <FileAttachButton
                onFileReady={handleFileReady}
                onError={setFileError}
                disabled={!connected}
                className="w-full justify-center"
              />
              {fileError ? (
                <p className="text-center text-xs text-destructive">{fileError}</p>
              ) : null}
              <Button
                type="button"
                className={cn(touchTarget, "h-12 w-full")}
                disabled={!canSend}
                onClick={handleSend}
              >
                {showSpinner ? (
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
          Text goes peer-to-peer. Files upload to IPFS, then the CID is sent to
          your computer.
        </p>
      </div>
    </div>
  );
}
