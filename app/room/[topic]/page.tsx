"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { isValidMeetCode, meetPath } from "@/lib/meet-code";

import { RealtimeCursors } from "@/components/realtime-cursors";
import { RoomMembersPanel } from "@/components/room-members-panel";
import { Button } from "@/components/ui/button";
import { useDeviceId } from "@/hooks/use-device-id";
import { AVATARS, getAvatarEmoji, type AvatarId } from "@/lib/avatars";
import { joinRoom } from "@/lib/rooms";
import {
  clearRoomSession,
  getRoomSession,
  saveRoomSession,
  type RoomSession,
} from "@/lib/room-session";
import { btnGhost, chip, panel } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default function RoomPage() {
  const params = useParams<{ topic: string }>();
  const router = useRouter();
  const topic = params.topic?.toLowerCase() ?? "";
  const { deviceId, ready: deviceReady } = useDeviceId();

  useEffect(() => {
    if (topic && isValidMeetCode(topic)) {
      router.replace(meetPath(topic));
    }
  }, [router, topic]);
  const [session, setSession] = useState<RoomSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!deviceReady || !deviceId || !topic) return;

    let cancelled = false;

    (async () => {
      const stored = getRoomSession();
      if (stored?.topic === topic && stored.deviceFingerprint === deviceId) {
        if (!cancelled) setSession(stored);
        return;
      }

      try {
        const m = await joinRoom(
          topic,
          deviceId,
          stored?.displayName,
          stored?.avatarId
        );
        const avatarId =
          AVATARS.find((a) => a.emoji === m.avatar)?.id ??
          stored?.avatarId ??
          ("fox" as AvatarId);
        const next: RoomSession = {
          topic: m.topic,
          title: m.title,
          displayName: m.display_name,
          deviceFingerprint: m.device_fingerprint,
          avatarId,
        };
        saveRoomSession(next);
        if (!cancelled) setSession(next);
      } catch {
        if (!cancelled) setError("Room not found");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deviceReady, deviceId, topic]);

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Link
          href="/"
          className="inline-flex h-8 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-surface-elevated"
        >
          Back
        </Link>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Joining…
      </main>
    );
  }

  const avatar = getAvatarEmoji(session.avatarId);

  return (
    <div className="relative min-h-screen bg-background">
      <RealtimeCursors
        roomName={session.topic}
        username={session.displayName}
        userId={session.deviceFingerprint}
        avatar={avatar}
      />

      <header
        className={cn(
          panel,
          "pointer-events-auto fixed left-4 top-4 z-40 flex cursor-auto items-center gap-2 py-3"
        )}
      >
        <span className="text-lg leading-none" aria-hidden>
          {avatar}
        </span>
        <span className={chip}>{session.topic}</span>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(session.topic);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className={btnGhost}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-sm text-ink-muted">{session.displayName}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            clearRoomSession();
            router.push("/");
          }}
        >
          Leave
        </Button>
      </header>

      <RoomMembersPanel
        topic={session.topic}
        deviceFingerprint={session.deviceFingerprint}
        currentDeviceFingerprint={session.deviceFingerprint}
      />
    </div>
  );
}
