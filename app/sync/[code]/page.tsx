"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ClipboardSyncShell } from "@/components/clipboard-sync-shell";
import { WaitingForHost } from "@/components/waiting-for-host";
import { useDeviceId } from "@/hooks/use-device-id";
import { AVATARS, type AvatarId } from "@/lib/avatars";
import { formatMeetCode } from "@/lib/meet-code";
import {
  getMyMembership,
  joinMeeting,
  type MemberStatus,
} from "@/lib/meetings";
import {
  clearRoomSession,
  getRoomSession,
  saveRoomSession,
  type RoomSession,
} from "@/lib/room-session";

function membershipToSession(
  m: {
    topic: string;
    title: string;
    display_name: string;
    device_fingerprint: string;
    avatar: string;
    is_host: boolean;
    member_status: MemberStatus;
  },
  avatarId?: AvatarId
): RoomSession {
  const resolvedAvatarId =
    AVATARS.find((a) => a.emoji === m.avatar)?.id ?? avatarId ?? "fox";
  return {
    topic: m.topic,
    title: m.title,
    displayName: m.display_name,
    deviceFingerprint: m.device_fingerprint,
    avatarId: resolvedAvatarId,
    isHost: m.is_host,
    memberStatus: m.member_status,
  };
}

export default function SyncPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = formatMeetCode(params.code ?? "");
  const { deviceId, ready: deviceReady } = useDeviceId();
  const [session, setSession] = useState<RoomSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const leave = useCallback(() => {
    clearRoomSession();
    router.push("/");
  }, [router]);

  useEffect(() => {
    if (!deviceReady || !deviceId || !code) return;

    let cancelled = false;

    const applyMembership = (m: Parameters<typeof membershipToSession>[0]) => {
      const stored = getRoomSession();
      const next = membershipToSession(m, stored?.avatarId);
      saveRoomSession(next);
      if (!cancelled) setSession(next);
      if (m.member_status === "rejected" && !cancelled) {
        setError("The host declined your request to join.");
      }
    };

    (async () => {
      const stored = getRoomSession();
      try {
        const m = await joinMeeting(
          code,
          deviceId,
          stored?.displayName,
          stored?.avatarId
        );
        applyMembership(m);
      } catch {
        if (!cancelled) setError("Meeting not found");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, deviceId, deviceReady]);

  useEffect(() => {
    if (!session || session.memberStatus !== "pending" || !deviceId) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const m = await getMyMembership(code, deviceId);
        if (cancelled) return;
        const next = membershipToSession(m, session.avatarId);
        saveRoomSession(next);
        setSession(next);
        if (m.member_status === "rejected") {
          setError("The host declined your request to join.");
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
  }, [session, code, deviceId]);

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
        Joining session…
      </main>
    );
  }

  if (session.memberStatus === "pending") {
    return (
      <WaitingForHost
        topic={session.topic}
        displayName={session.displayName}
        onLeave={leave}
      />
    );
  }

  if (session.memberStatus === "rejected") {
    return null;
  }

  return <ClipboardSyncShell session={session} onLeave={leave} />;
}
