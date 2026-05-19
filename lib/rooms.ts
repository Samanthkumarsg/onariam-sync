import { createClient } from "@/lib/client";
import { getAvatarEmoji } from "@/lib/avatars";

export type RoomMember = {
  display_name: string;
  device_fingerprint: string;
  avatar: string;
  joined_at: string;
  last_seen_at: string;
};

export type JoinRoomResult = {
  topic: string;
  title: string;
  display_name: string;
  device_fingerprint: string;
  avatar: string;
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

export async function createRoom(
  deviceFingerprint: string,
  displayName?: string,
  avatarId?: string
) {
  const supabase = createClient();
  const { data: created, error: createError } = await supabase.rpc("create_room", {
    p_title: null,
  });

  if (createError) {
    throw new Error(formatError(createError));
  }

  const room = firstRow<{ topic: string; title: string }>(created);
  return joinRoom(room.topic, deviceFingerprint, displayName, avatarId);
}

export async function joinRoom(
  topic: string,
  deviceFingerprint: string,
  displayName?: string,
  avatarId?: string
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("join_room", {
    p_topic: topic.trim().toLowerCase(),
    p_device_fingerprint: deviceFingerprint,
    p_display_name: displayName?.trim() || null,
    p_avatar: getAvatarEmoji(avatarId ?? "fox"),
  });

  if (error) {
    throw new Error(formatError(error));
  }

  return firstRow<JoinRoomResult>(data);
}

export async function getRoomMembers(topic: string, deviceFingerprint: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_room_members", {
    p_topic: topic,
    p_device_fingerprint: deviceFingerprint,
  });

  if (error) {
    throw new Error(formatError(error));
  }

  return (data ?? []) as RoomMember[];
}
