import { createClient } from "@/lib/client";
import { getAvatarEmoji } from "@/lib/avatars";
import { formatMeetCode } from "@/lib/meet-code";

export type MeetingMembership = {
  topic: string;
  title: string;
  display_name: string;
  device_fingerprint: string;
  avatar: string;
  target_url: string | null;
  is_host: boolean;
};

export type MeetingState = {
  topic: string;
  target_url: string | null;
  url_updated_at: string | null;
  is_host: boolean;
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

function formatError(err: { message?: string; details?: string; hint?: string }) {
  return [err.message, err.details, err.hint].filter(Boolean).join(" — ");
}

export async function createMeeting(
  deviceFingerprint: string,
  displayName?: string,
  avatarId?: string,
  targetUrl?: string
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_meeting", {
    p_device_fingerprint: deviceFingerprint,
    p_display_name: displayName?.trim() || null,
    p_avatar: getAvatarEmoji(avatarId ?? "fox"),
    p_target_url: targetUrl?.trim() || null,
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

export async function setMeetingUrl(
  topic: string,
  deviceFingerprint: string,
  targetUrl: string
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("set_meeting_url", {
    p_topic: formatMeetCode(topic),
    p_device_fingerprint: deviceFingerprint,
    p_target_url: targetUrl,
  });

  if (error) {
    throw new Error(formatError(error));
  }

  return firstRow<{ topic: string; target_url: string }>(data);
}

export async function getMeetingState(topic: string, deviceFingerprint: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_meeting_state", {
    p_topic: formatMeetCode(topic),
    p_device_fingerprint: deviceFingerprint,
  });

  if (error) {
    throw new Error(formatError(error));
  }

  return firstRow<MeetingState>(data);
}
