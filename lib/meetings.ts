import { createClient } from "@/lib/client";
import { getAvatarEmoji } from "@/lib/avatars";
import { formatMeetCode } from "@/lib/meet-code";

export type MemberStatus = "pending" | "approved" | "rejected";

export type MeetingMembership = {
  topic: string;
  title: string;
  display_name: string;
  device_fingerprint: string;
  avatar: string;
  is_host: boolean;
  member_status: MemberStatus;
};

export type RoomMember = {
  display_name: string;
  device_fingerprint: string;
  avatar: string;
  joined_at: string;
  last_seen_at: string;
  status: MemberStatus;
};

function firstRow<T>(data: unknown): T {
  if (Array.isArray(data) && data[0]) {
    return data[0] as T;
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as T;
  }
  throw new Error("Unexpected response from server");
}

function formatError(err: {
  message?: string;
  details?: string;
  hint?: string;
}) {
  return [err.message, err.details, err.hint].filter(Boolean).join(" — ");
}

export async function createMeeting(
  deviceFingerprint: string,
  displayName?: string,
  avatarId?: string
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_meeting", {
    p_device_fingerprint: deviceFingerprint,
    p_display_name: displayName?.trim() || null,
    p_avatar: getAvatarEmoji(avatarId ?? "fox"),
  });

  if (error) {
    throw new Error(formatError(error));
  }

  return firstRow<MeetingMembership>(data);
}

export async function joinMeeting(
  code: string,
  deviceFingerprint: string,
  displayName?: string,
  avatarId?: string
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("join_meeting", {
    p_topic: formatMeetCode(code),
    p_device_fingerprint: deviceFingerprint,
    p_display_name: displayName?.trim() || null,
    p_avatar: getAvatarEmoji(avatarId ?? "fox"),
  });

  if (error) {
    throw new Error(formatError(error));
  }

  return firstRow<MeetingMembership>(data);
}

export async function getMyMembership(
  code: string,
  deviceFingerprint: string
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_my_membership", {
    p_topic: formatMeetCode(code),
    p_device_fingerprint: deviceFingerprint,
  });

  if (error) {
    throw new Error(formatError(error));
  }

  return firstRow<MeetingMembership>(data);
}

export async function getRoomMembers(
  topic: string,
  deviceFingerprint: string
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_room_members", {
    p_topic: formatMeetCode(topic),
    p_device_fingerprint: deviceFingerprint,
  });

  if (error) {
    throw new Error(formatError(error));
  }

  return (data ?? []) as RoomMember[];
}

export async function approveMember(
  topic: string,
  hostFingerprint: string,
  memberFingerprint: string
) {
  const supabase = createClient();
  const { error } = await supabase.rpc("approve_member", {
    p_topic: formatMeetCode(topic),
    p_host_fingerprint: hostFingerprint,
    p_member_fingerprint: memberFingerprint,
  });

  if (error) {
    throw new Error(formatError(error));
  }
}

export async function rejectMember(
  topic: string,
  hostFingerprint: string,
  memberFingerprint: string
) {
  const supabase = createClient();
  const { error } = await supabase.rpc("reject_member", {
    p_topic: formatMeetCode(topic),
    p_host_fingerprint: hostFingerprint,
    p_member_fingerprint: memberFingerprint,
  });

  if (error) {
    throw new Error(formatError(error));
  }
}
