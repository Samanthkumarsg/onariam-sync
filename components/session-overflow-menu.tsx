"use client";

import {
  Check,
  Link2,
  LogOut,
  MoreHorizontal,
  Smartphone,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  copiedInvite: boolean;
  onCopyInvite: () => void;
  copiedSendLink: boolean;
  onCopySendLink: () => void;
  showSendUrl: boolean;
  onToggleSendUrl: () => void;
  onOpenParticipants: () => void;
  onLeave: () => void;
};

export function SessionOverflowMenu({
  copiedInvite,
  onCopyInvite,
  copiedSendLink,
  onCopySendLink,
  showSendUrl,
  onToggleSendUrl,
  onOpenParticipants,
  onLeave,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const itemClass = cn(
    touchTarget,
    "flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm text-foreground hover:bg-surface-elevated"
  );

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          touchTarget,
          "inline-flex size-11 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-surface-elevated hover:text-foreground sm:size-9",
          open && "border-primary/40 bg-primary/10 text-primary"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Session menu"
      >
        <MoreHorizontal className="size-5" aria-hidden />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1.5 w-[min(100vw-2rem,16rem)] overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              onCopyInvite();
              setOpen(false);
            }}
          >
            {copiedInvite ? (
              <Check className="size-4 shrink-0 text-primary" aria-hidden />
            ) : (
              <Users className="size-4 shrink-0" aria-hidden />
            )}
            {copiedInvite ? "Invite copied" : "Copy session invite"}
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              onCopySendLink();
              setOpen(false);
            }}
          >
            {copiedSendLink ? (
              <Check className="size-4 shrink-0 text-primary" aria-hidden />
            ) : (
              <Smartphone className="size-4 shrink-0" aria-hidden />
            )}
            {copiedSendLink ? "Send link copied" : "Copy phone send link"}
          </button>
          <button
            type="button"
            role="menuitem"
            className={cn(itemClass, "text-muted-foreground")}
            onClick={() => {
              onToggleSendUrl();
            }}
          >
            <Link2 className="size-4 shrink-0" aria-hidden />
            {showSendUrl ? "Hide send link" : "Show send link"}
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              onOpenParticipants();
              setOpen(false);
            }}
          >
            <Users className="size-4 shrink-0" aria-hidden />
            Participants
          </button>
          <div className="my-1 h-px bg-border" role="separator" />
          <button
            type="button"
            role="menuitem"
            className={cn(
              itemClass,
              "text-destructive hover:bg-destructive/10 hover:text-destructive"
            )}
            onClick={() => {
              setOpen(false);
              onLeave();
            }}
          >
            <LogOut className="size-4 shrink-0" aria-hidden />
            Leave session
          </button>
        </div>
      )}
    </div>
  );
}
