"use client";

import { ChevronDown, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useRoomMembers } from "@/hooks/use-room-members";
import type { RoomMember } from "@/lib/rooms";
import { btnGhost } from "@/lib/ui";
import { cn } from "@/lib/utils";

const MAX_STACK = 3;
const SCROLL_THRESHOLD = 6;

type Props = {
  topic: string;
  deviceFingerprint: string;
  currentDeviceFingerprint: string;
};

function AvatarStack({ members, total }: { members: RoomMember[]; total: number }) {
  const shown = members.slice(0, MAX_STACK);
  const overflow = total - shown.length;

  return (
    <span className="flex items-center -space-x-1.5" aria-hidden>
      {shown.map((m) => (
        <span
          key={m.device_fingerprint}
          className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-card text-xs leading-none"
        >
          {m.avatar ?? "🦊"}
        </span>
      ))}
      {overflow > 0 && (
        <span className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-surface-elevated text-[9px] font-medium text-muted-foreground">
          +{overflow}
        </span>
      )}
    </span>
  );
}

function MemberRow({
  member,
  isYou,
}: {
  member: RoomMember;
  isYou: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5",
        isYou ? "bg-primary/10" : "hover:bg-surface-elevated/80"
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border text-sm leading-none",
          isYou
            ? "border-primary/40 bg-primary/15"
            : "border-border bg-card"
        )}
        aria-hidden
      >
        {member.avatar ?? "🦊"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {member.display_name}
        </p>
        {isYou && <p className="text-[11px] text-primary">You</p>}
      </div>
    </li>
  );
}

export function ParticipantsMenu({
  topic,
  deviceFingerprint,
  currentDeviceFingerprint,
}: Props) {
  const { sortedMembers, count } = useRoomMembers(
    topic,
    deviceFingerprint,
    currentDeviceFingerprint
  );
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

  if (count === 0) return null;

  const needsScroll = count > SCROLL_THRESHOLD;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          btnGhost,
          "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-elevated/60 px-2 py-1",
          open && "border-primary/30 bg-primary/10"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${count} participant${count === 1 ? "" : "s"} in room`}
      >
        <Users className="size-3.5 shrink-0 text-primary" aria-hidden />
        <AvatarStack members={sortedMembers} total={count} />
        <span className="tabular-nums text-xs font-semibold text-foreground">
          {count}
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
          className={cn(
            "absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-lg border border-border",
            "bg-card shadow-lg ring-1 ring-inset ring-white/[0.04]"
          )}
          role="listbox"
          aria-label="Participants in room"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-medium text-foreground">In room</p>
            <p className="text-[11px] text-muted-foreground">
              {count === 1 ? "1 person" : `${count} people`}
            </p>
          </div>
          <ul
            className={cn(
              "space-y-0.5 p-1.5",
              needsScroll &&
                "max-h-[min(280px,50vh)] overflow-y-auto overscroll-contain [scrollbar-width:thin]"
            )}
          >
            {sortedMembers.map((m) => (
              <MemberRow
                key={m.device_fingerprint}
                member={m}
                isYou={m.device_fingerprint === currentDeviceFingerprint}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
