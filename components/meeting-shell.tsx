"use client";

import { FormEvent, useMemo, useRef, useState } from "react";

import {
  MeetingHeader,
  MeetingUrlBar,
} from "@/components/meeting-header";
import { RealtimeCursors } from "@/components/realtime-cursors";
import { RoomMembersPanel } from "@/components/room-members-panel";
import { useMeetingUrl } from "@/hooks/use-meeting-url";
import { getAvatarEmoji } from "@/lib/avatars";
import { browseProxyUrl } from "@/lib/browse-proxy";
import { meetShareUrl } from "@/lib/meet-code";
import type { RoomSession } from "@/lib/room-session";

type Props = {
  session: RoomSession;
  onLeave: () => void;
};

export function MeetingShell({ session, onLeave }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
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

  const iframeSrc = useMemo(
    () => (targetUrl ? browseProxyUrl(targetUrl) : ""),
    [targetUrl]
  );

  return (
    <div className="relative flex h-screen flex-col bg-background">
      {!targetUrl && (
        <RealtimeCursors
          roomName={session.topic}
          username={session.displayName}
          userId={session.deviceFingerprint}
          avatar={avatar}
        />
      )}

      <MeetingHeader
        topic={session.topic}
        displayName={session.displayName}
        avatar={avatar}
        isHost={isHost}
        copiedLink={copiedLink}
        copiedCode={copiedCode}
        onCopyLink={async () => {
          await navigator.clipboard.writeText(meetShareUrl(session.topic));
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 1500);
        }}
        onCopyCode={async () => {
          await navigator.clipboard.writeText(session.topic);
          setCopiedCode(true);
          setTimeout(() => setCopiedCode(false), 1500);
        }}
        onLeave={onLeave}
        urlBar={
          isHost ? (
            <MeetingUrlBar
              urlInput={urlInput}
              saving={saving}
              error={urlError}
              onUrlInputChange={setUrlInput}
              onSubmit={handleUrlSubmit}
            />
          ) : undefined
        }
      />

      <div className="relative min-h-0 flex-1">
        {targetUrl ? (
          <>
            <iframe
              ref={iframeRef}
              key={iframeSrc}
              title="Shared browser"
              src={iframeSrc}
              className="relative z-0 h-full w-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-pointer-lock"
              referrerPolicy="no-referrer"
            />
            <div className="pointer-events-none absolute inset-0 z-10">
              <RealtimeCursors
                roomName={session.topic}
                username={session.displayName}
                userId={session.deviceFingerprint}
                avatar={avatar}
                iframeRef={iframeRef}
              />
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              {isHost ? "Enter a URL above to browse together" : "Waiting for the host to open a page"}
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Click, scroll, and type in the shared page once the host opens a URL.
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
