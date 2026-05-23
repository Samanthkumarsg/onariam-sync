import type { AvatarId } from "@/lib/avatars";
import type { MemberStatus } from "@/lib/meetings";

export type RoomSession = {
  topic: string;
  title: string;
  displayName: string;
  deviceFingerprint: string;
  avatarId: AvatarId;
  isHost?: boolean;
  memberStatus?: MemberStatus;
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
      memberStatus: parsed.memberStatus,
    };
  } catch {
    return null;
  }
}

export function clearRoomSession() {
  localStorage.removeItem(STORAGE_KEY);
}
