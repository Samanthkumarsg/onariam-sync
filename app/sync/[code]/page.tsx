"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MeetingShell } from "@/components/meeting-shell";
import { useDeviceId } from "@/hooks/use-device-id";
import { AVATARS, type AvatarId } from "@/lib/avatars";
import { formatMeetCode } from "@/lib/meet-code";
import { joinMeeting } from "@/lib/meetings";
import {
  clearRoomSession,
  getRoomSession,
  saveRoomSession,
  type RoomSession,
} from "@/lib/room-session";

export default function SyncPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = formatMeetCode(params.code ?? "");
  const { deviceId, ready: deviceReady } = useDeviceId();
  const [session, setSession] = useState<RoomSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceReady || !deviceId || !code) return;

    let cancelled = false;

    (async () => {
      const stored = getRoomSession();
      if (stored?.topic === code && stored.deviceFingerprint === deviceId) {
        if (!cancelled) setSession(stored);
        return;
      }

      try {
        const m = await joinMeeting(
          code,
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
          isHost: m.is_host,
          targetUrl: m.target_url,
        };
        saveRoomSession(next);
        if (!cancelled) setSession(next);
      } catch {
        if (!cancelled) setError("Meeting not found");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, deviceId, deviceReady]);

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
        Joining meeting…
      </main>
    );
  }

  return (
    <MeetingShell
      session={session}
      onLeave={() => {
        clearRoomSession();
        router.push("/");
      }}
    />
  );
}
