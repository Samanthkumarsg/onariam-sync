"use client";

import { AVATARS, DEFAULT_AVATAR_ID, type AvatarId } from "@/lib/avatars";
import { cn } from "@/lib/utils";

type Props = {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
  compact?: boolean;
};

export function AvatarPicker({ value, onChange, compact = false }: Props) {
  return (
    <div
      className={cn(
        "grid justify-items-center gap-2",
        compact ? "grid-cols-4 sm:grid-cols-5" : "grid-cols-4 sm:grid-cols-6"
      )}
      role="radiogroup"
      aria-label="Choose avatar"
    >
      {AVATARS.map((avatar) => {
        const selected = value === avatar.id;
        return (
          <button
            key={avatar.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={avatar.id}
            onClick={() => onChange(avatar.id)}
            className={cn(
              "flex items-center justify-center rounded-full transition-all duration-200 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              "motion-safe:active:scale-95",
                compact ? "size-11 text-2xl sm:size-10" : "size-11 text-2xl",
              selected
                ? "motion-safe:scale-125 opacity-100"
                : "opacity-40 motion-safe:hover:scale-110 motion-safe:hover:opacity-90"
            )}
          >
            {avatar.emoji}
          </button>
        );
      })}
    </div>
  );
}

export { DEFAULT_AVATAR_ID };
