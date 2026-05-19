"use client";

import { FormEvent, useState } from "react";

import { RealtimeCursors } from "@/components/realtime-cursors";
import { RoomMembersPanel } from "@/components/room-members-panel";
import { Button } from "@/components/ui/button";
import { useMeetingUrl } from "@/hooks/use-meeting-url";
import { getAvatarEmoji } from "@/lib/avatars";
import { meetShareUrl } from "@/lib/meet-code";
import type { RoomSession } from "@/lib/room-session";
import { btnGhost, chip, input, panel } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  session: RoomSession;
  onLeave: () => void;
};

export function MeetingShell({ session, onLeave }: Props) {
  const avatar = getAvatarEmoji(session.avatarId);
  const isHost = session.isHost ?? false;
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const {
    targetUrl,
    urlInput,
    setUrlInput,
    navigateAsHost,
    saving,
    error: urlError,
  } = useMeetingUrl({
    roomName: session.topic,
    deviceFingerprint: session.deviceFingerprint,
    isHost,
    initialUrl: session.targetUrl ?? null,
  });

  const handleUrlSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    void navigateAsHost(urlInput);
  };

  return (
    <div className="relative flex h-screen flex-col bg-background">
      <RealtimeCursors
        roomName={session.topic}
        username={session.displayName}
        userId={session.deviceFingerprint}
        avatar={avatar}
      />

      <header
        className={cn(
          panel,
          "z-40 flex shrink-0 cursor-auto flex-wrap items-center gap-2 border-b border-border py-2.5"
        )}
      >
        <span className="text-lg leading-none" aria-hidden>
          {avatar}
        </span>
        <span className={chip}>{session.topic}</span>
        {isHost && (
          <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            Host
          </span>
        )}
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(meetShareUrl(session.topic));
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 1500);
          }}
          className={btnGhost}
        >
          {copiedLink ? "Link copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(session.topic);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 1500);
          }}
          className={btnGhost}
        >
          {copiedCode ? "Code copied" : "Copy code"}
        </button>
        <span className="hidden text-muted-foreground/40 sm:inline">·</span>
        <span className="text-sm text-ink-muted">{session.displayName}</span>
        <div className="ml-auto">
          <Button type="button" variant="ghost" size="sm" onClick={onLeave}>
            Leave
          </Button>
        </div>
      </header>

      {isHost && (
        <form
          onSubmit={handleUrlSubmit}
          className="z-40 flex shrink-0 cursor-auto items-center gap-2 border-b border-border bg-card px-3 py-2"
        >
          <label htmlFor="meet-url" className="sr-only">
            Page URL
          </label>
          <input
            id="meet-url"
            type="text"
            className={cn(input, "min-w-0 flex-1 font-mono text-[13px]")}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com"
            spellCheck={false}
            autoComplete="url"
          />
          <Button type="submit" size="sm" disabled={saving || !urlInput.trim()}>
            {saving ? "…" : "Go"}
          </Button>
          {urlError && (
            <p className="text-xs text-destructive" role="alert">
              {urlError}
            </p>
          )}
        </form>
      )}

      <div className="relative min-h-0 flex-1">
        {targetUrl ? (
          <iframe
            title="Shared browser"
            src={targetUrl}
            className="h-full w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              {isHost ? "Enter a URL above to browse together" : "Waiting for the host to open a page"}
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Cursors appear on this shell around the page. They do not track inside the embedded site.
            </p>
          </div>
        )}
      </div>

      <RoomMembersPanel
        topic={session.topic}
        deviceFingerprint={session.deviceFingerprint}
        currentDeviceFingerprint={session.deviceFingerprint}
      />
    </div>
  );
}
