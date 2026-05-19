export const AVATARS = [
  { id: "fox", emoji: "🦊" },
  { id: "cat", emoji: "🐱" },
  { id: "dog", emoji: "🐶" },
  { id: "bear", emoji: "🐻" },
  { id: "panda", emoji: "🐼" },
  { id: "rabbit", emoji: "🐰" },
  { id: "lion", emoji: "🦁" },
  { id: "frog", emoji: "🐸" },
  { id: "owl", emoji: "🦉" },
  { id: "unicorn", emoji: "🦄" },
  { id: "robot", emoji: "🤖" },
  { id: "alien", emoji: "👽" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

export const DEFAULT_AVATAR_ID: AvatarId = "fox";

export function getAvatar(id: string) {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

export function getAvatarEmoji(id: string) {
  return getAvatar(id).emoji;
}
