import type { AvatarId } from "@/lib/avatars";

export type RoomSession = {
  topic: string;
  title: string;
  displayName: string;
  deviceFingerprint: string;
  avatarId: AvatarId;
  isHost?: boolean;
  targetUrl?: string | null;
};

const STORAGE_KEY = "onariam-room-session";

export function saveRoomSession(session: RoomSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getRoomSession(): RoomSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RoomSession>;
    if (!parsed.topic || !parsed.deviceFingerprint) {
      return null;
    }
    return {
      topic: parsed.topic,
      title: parsed.title ?? parsed.topic,
      displayName: parsed.displayName ?? "Guest",
      deviceFingerprint: parsed.deviceFingerprint,
      avatarId: parsed.avatarId ?? "fox",
      isHost: parsed.isHost,
      targetUrl: parsed.targetUrl,
    };
  } catch {
    return null;
  }
}

export function clearRoomSession() {
  localStorage.removeItem(STORAGE_KEY);
}
