"use client";

import { Check, ChevronDown, Loader2, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useRoomMembers } from "@/hooks/use-room-members";
import type { RoomMember } from "@/lib/meetings";
import { btnGhost } from "@/lib/ui";
import { cn } from "@/lib/utils";

const MAX_STACK = 3;
const SCROLL_THRESHOLD = 6;

type Props = {
  topic: string;
  deviceFingerprint: string;
  currentDeviceFingerprint: string;
  isHost?: boolean;
  /** Match toolbar control height (e.g. h-9) */
  triggerClassName?: string;
};

function AvatarStack({ members, total }: { members: RoomMember[]; total: number }) {
  const shown = members.filter((m) => m.status === "approved").slice(0, MAX_STACK);
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
  isHost,
  onApprove,
  onReject,
  acting,
}: {
  member: RoomMember;
  isYou: boolean;
  isHost: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  acting?: boolean;
}) {
  const pending = member.status === "pending";

  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5",
        isYou ? "bg-primary/10" : "hover:bg-surface-elevated/80",
        pending && !isYou && "ring-1 ring-amber-500/30"
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
        <p className="text-[11px] text-muted-foreground">
          {isYou
            ? isHost
              ? "You · Host"
              : "You"
            : pending
              ? "Waiting for approval"
              : member.status === "rejected"
                ? "Rejected"
                : "In session"}
        </p>
      </div>
      {isHost && pending && !isYou && onApprove && onReject && (
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            disabled={acting}
            onClick={onApprove}
            className="flex size-10 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 disabled:opacity-50 touch-manipulation sm:size-7"
            aria-label={`Approve ${member.display_name}`}
          >
            {acting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
          </button>
          <button
            type="button"
            disabled={acting}
            onClick={onReject}
            className="flex size-10 items-center justify-center rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25 disabled:opacity-50 touch-manipulation sm:size-7"
            aria-label={`Decline ${member.display_name}`}
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </li>
  );
}

export function ParticipantsMenu({
  topic,
  deviceFingerprint,
  currentDeviceFingerprint,
  isHost = false,
  triggerClassName,
}: Props) {
  const {
    sortedMembers,
    approvedCount,
    pendingMembers,
    loading,
    error,
    approve,
    reject,
  } = useRoomMembers(
    topic,
    deviceFingerprint,
    currentDeviceFingerprint,
    isHost
  );

  const [open, setOpen] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
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

  const displayCount = isHost
    ? sortedMembers.length
    : approvedCount || (loading ? 0 : 1);

  const needsScroll = sortedMembers.length > SCROLL_THRESHOLD;

  const handleApprove = async (fp: string) => {
    setActingId(fp);
    try {
      await approve(fp);
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (fp: string) => {
    setActingId(fp);
    try {
      await reject(fp);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          btnGhost,
          "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card/80 px-2.5 py-0",
          "ring-1 ring-inset ring-white/[0.04]",
          open && "border-primary/30 bg-primary/10",
          isHost && pendingMembers.length > 0 && "border-amber-500/40",
          triggerClassName
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${displayCount} participant${displayCount === 1 ? "" : "s"} in room`}
      >
        <Users className="size-4 shrink-0 text-primary sm:size-3.5" aria-hidden />
        {loading ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : (
          <span className="hidden sm:inline-flex">
            <AvatarStack members={sortedMembers} total={displayCount} />
          </span>
        )}
        <span className="tabular-nums text-xs font-semibold text-foreground">
          {loading ? "…" : displayCount}
        </span>
        {isHost && pendingMembers.length > 0 && (
          <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            {pendingMembers.length}
          </span>
        )}
        <ChevronDown
          className={cn(
            "hidden size-3.5 shrink-0 text-muted-foreground transition-transform sm:block",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className={cn(
            "z-50 overflow-hidden rounded-lg border border-border bg-card shadow-lg",
            "ring-1 ring-inset ring-white/[0.04]",
            "fixed inset-x-3 top-[calc(3.75rem+env(safe-area-inset-top,0px))] max-h-[min(70dvh,24rem)] overflow-y-auto overscroll-contain",
            "sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1.5 sm:w-72 sm:max-h-none sm:overflow-visible"
          )}
          role="listbox"
          aria-label="Participants in room"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-medium text-foreground">
              {isHost ? "Participants" : "In session"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {loading
                ? "Loading…"
                : error
                  ? error
                  : isHost && pendingMembers.length > 0
                    ? `${pendingMembers.length} waiting for approval`
                    : `${approvedCount} active`}
            </p>
          </div>
          {sortedMembers.length === 0 && !loading ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              No participants yet
            </p>
          ) : (
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
                  isHost={isHost}
                  acting={actingId === m.device_fingerprint}
                  onApprove={
                    isHost && m.status === "pending"
                      ? () => void handleApprove(m.device_fingerprint)
                      : undefined
                  }
                  onReject={
                    isHost && m.status === "pending"
                      ? () => void handleReject(m.device_fingerprint)
                      : undefined
                  }
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
