import type { AvatarId } from "@/lib/avatars";
import { DEFAULT_AVATAR_ID } from "@/lib/avatars";
import { formatMeetCode } from "@/lib/meet-code";
import type { RoomSession } from "@/lib/room-session";

export const JOIN_PROFILE_DRAFT_KEY = "onariam-join-profile-draft";

export type JoinProfileDraft = {
  name: string;
  avatarId: AvatarId;
};

export function loadJoinProfileDraft(): JoinProfileDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(JOIN_PROFILE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<JoinProfileDraft>;
    return {
      name: parsed.name ?? "",
      avatarId: parsed.avatarId ?? DEFAULT_AVATAR_ID,
    };
  } catch {
    return null;
  }
}

export function saveJoinProfileDraft(draft: JoinProfileDraft) {
  if (typeof window === "undefined") return;
  localStorage.setItem(JOIN_PROFILE_DRAFT_KEY, JSON.stringify(draft));
}

/** True when user must pick / confirm name and avatar before joining this code. */
export function needsJoinProfile(
  code: string,
  session: RoomSession | null
): boolean {
  const formatted = formatMeetCode(code);
  if (!session || formatMeetCode(session.topic) !== formatted) return true;
  if (!session.displayName?.trim()) return true;
  return false;
}
