"use client";

import { AVATARS, DEFAULT_AVATAR_ID, type AvatarId } from "@/lib/avatars";
import { cn } from "@/lib/utils";

type Props = {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
};

export function AvatarPicker({ value, onChange }: Props) {
  return (
    <div
      className="grid grid-cols-6 gap-2"
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
              "flex size-10 items-center justify-center rounded-md text-xl transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              selected
                ? "bg-surface-elevated ring-1 ring-primary ring-offset-2 ring-offset-card"
                : "bg-secondary hover:bg-accent"
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
