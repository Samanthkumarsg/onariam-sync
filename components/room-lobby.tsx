"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AvatarPicker,
  DEFAULT_AVATAR_ID,
} from "@/components/avatar-picker";
import { Button } from "@/components/ui/button";
import { useDeviceId } from "@/hooks/use-device-id";
import type { AvatarId } from "@/lib/avatars";
import { isValidMeetCode, meetPath, normalizeMeetCodeInput } from "@/lib/meet-code";
import { createMeeting, joinMeeting, type MeetingMembership } from "@/lib/meetings";
import { saveRoomSession } from "@/lib/room-session";
import { divider, eyebrow, headline, input, label, panel, subhead } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function RoomLobby() {
  const router = useRouter();
  const { deviceId, ready } = useDeviceId();
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR_ID);
  const [startUrl, setStartUrl] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToMeeting = (
    membership: MeetingMembership,
    chosenAvatarId: AvatarId
  ) => {
    saveRoomSession({
      topic: membership.topic,
      title: membership.title,
      displayName: membership.display_name,
      deviceFingerprint: membership.device_fingerprint,
      avatarId: chosenAvatarId,
      isHost: membership.is_host,
      targetUrl: membership.target_url,
    });
    router.push(meetPath(membership.topic));
  };

  const handleStart = async () => {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    try {
      goToMeeting(
        await createMeeting(
          deviceId,
          name || undefined,
          avatarId,
          startUrl.trim() || undefined
        ),
        avatarId
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start meeting");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!deviceId) return;
    const formatted = normalizeMeetCodeInput(code);
    if (!isValidMeetCode(formatted)) {
      setError("Enter a code like abc-defg-hijk");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      goToMeeting(
        await joinMeeting(formatted, deviceId, name || undefined, avatarId),
        avatarId
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not join";
      setError(msg.includes("meeting not found") ? "Meeting not found" : msg);
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || !ready || !deviceId;

  return (
    <main className="flex min-h-screen items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-[420px] space-y-8">
        <header className="space-y-2 text-center">
          <p className={eyebrow}>Co-browse</p>
          <h1 className={headline}>Onariam Sync</h1>
          <p className={subhead}>
            Google Meet–style link. Host shares a page; everyone follows in sync.
          </p>
        </header>

        <div className={cn(panel, "space-y-5")}>
          <label className="block space-y-1.5">
            <span className={label}>Your name</span>
            <input
              className={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
              maxLength={64}
              autoComplete="nickname"
            />
          </label>

          <div className="space-y-2">
            <span className={label}>Avatar</span>
            <AvatarPicker value={avatarId} onChange={setAvatarId} />
          </div>

          <label className="block space-y-1.5">
            <span className={label}>Starting page (host)</span>
            <input
              className={cn(input, "font-mono text-[13px]")}
              value={startUrl}
              onChange={(e) => setStartUrl(e.target.value)}
              placeholder="https://example.com"
              spellCheck={false}
              autoComplete="url"
            />
          </label>

          <Button
            type="button"
            disabled={busy}
            onClick={handleStart}
            className="w-full"
            size="lg"
          >
            {loading ? "…" : "Start meeting"}
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className={divider} />
            or join with code
            <span className={divider} />
          </div>

          <label className="block space-y-1.5">
            <span className={label}>Meeting code</span>
            <input
              className={cn(input, "font-mono tracking-[0.12em]")}
              value={code}
              onChange={(e) => setCode(normalizeMeetCodeInput(e.target.value))}
              placeholder="abc-defg-hijk"
              maxLength={12}
              autoComplete="off"
            />
          </label>

          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={handleJoin}
            className="w-full"
            size="lg"
          >
            Join meeting
          </Button>

          {error && (
            <p className="text-center text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
