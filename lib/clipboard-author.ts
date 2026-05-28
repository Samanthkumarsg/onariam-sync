import type { ClipboardBoardItem } from "@/lib/clipboard-inbox-storage";
import { getAvatarEmoji } from "@/lib/avatars";
import type { RoomMember } from "@/lib/meetings";

export type ItemAuthor = {
  emoji: string;
  displayName: string;
};

/** Emoji + name for whoever pasted this board item. */
export function resolveItemAuthor(
  item: ClipboardBoardItem,
  members: RoomMember[]
): ItemAuthor {
  if (item.authorAvatar) {
    return {
      emoji: item.authorAvatar,
      displayName: item.author?.trim() || "Guest",
    };
  }

  if (item.authorDeviceFingerprint) {
    const byDevice = members.find(
      (m) => m.device_fingerprint === item.authorDeviceFingerprint
    );
    if (byDevice) {
      return {
        emoji: byDevice.avatar ?? getAvatarEmoji("fox"),
        displayName: item.author?.trim() || byDevice.display_name,
      };
    }
  }

  if (item.author) {
    const byName = members.find((m) => m.display_name === item.author);
    if (byName) {
      return {
        emoji: byName.avatar ?? getAvatarEmoji("fox"),
        displayName: byName.display_name,
      };
    }
  }

  if (item.source === "mobile") {
    return { emoji: "📱", displayName: item.author?.trim() || "Phone" };
  }
  if (item.source === "host") {
    return { emoji: "🦊", displayName: item.author?.trim() || "Host" };
  }

  return {
    emoji: getAvatarEmoji("fox"),
    displayName: item.author?.trim() || "Guest",
  };
}
