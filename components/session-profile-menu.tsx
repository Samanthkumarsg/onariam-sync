"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getAvatarEmoji } from "@/lib/avatars";
import type { RoomSession } from "@/lib/room-session";
import { touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  session: RoomSession;
  onLeave: () => void;
};

export function SessionProfileMenu({ session, onLeave }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const emoji = getAvatarEmoji(session.avatarId);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          touchTarget,
          "inline-flex h-10 items-center gap-1 rounded-md px-1 sm:h-9",
          open && "bg-surface-elevated"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Your profile — ${session.displayName}`}
      >
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-base leading-none sm:size-7 sm:text-sm"
          aria-hidden
        >
          {emoji}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-full z-50 mt-1.5 min-w-[11rem] overflow-hidden rounded-xl border border-border bg-card shadow-md",
            "fixed inset-x-3 top-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:absolute sm:inset-x-auto sm:top-full"
          )}
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="text-base leading-none" aria-hidden>
                {emoji}
              </span>
              <span className="truncate">{session.displayName}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {session.isHost ? "Host" : "In session"}
            </p>
          </div>
          <div className="p-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLeave();
              }}
              className={cn(
                touchTarget,
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10"
              )}
            >
              <LogOut className="size-4 shrink-0" aria-hidden />
              Leave session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
