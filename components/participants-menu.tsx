"use client";

import {
  Check,
  ChevronDown,
  Loader2,
  Monitor,
  Smartphone,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useRoomMembers } from "@/hooks/use-room-members";
import type { RoomMember } from "@/lib/meetings";
import { toolbarControl } from "@/lib/ui";
import { cn } from "@/lib/utils";

const MAX_STACK = 3;
const SCROLL_THRESHOLD = 6;

export type ParticipantDeviceKind = "desktop" | "mobile";

type Props = {
  topic: string;
  deviceFingerprint: string;
  currentDeviceFingerprint: string;
  /** Device type for the current browser (shown next to "You" in the list). */
  currentDeviceKind?: ParticipantDeviceKind;
  isHost?: boolean;
  /** Match toolbar control height (e.g. h-9) */
  triggerClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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

function DeviceKindIcon({ kind }: { kind: ParticipantDeviceKind }) {
  const Icon = kind === "mobile" ? Smartphone : Monitor;
  const label = kind === "mobile" ? "Phone" : "Desktop";
  return (
    <span className="shrink-0" title={label}>
      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function MemberRow({
  member,
  isYou,
  isHost,
  deviceKind,
  onApprove,
  onReject,
  acting,
}: {
  member: RoomMember;
  isYou: boolean;
  isHost: boolean;
  deviceKind?: ParticipantDeviceKind;
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
        <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-foreground">
          <span className="truncate">{member.display_name}</span>
          {isYou && deviceKind ? (
            <DeviceKindIcon kind={deviceKind} />
          ) : null}
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
            className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground hover:bg-accent/80 disabled:opacity-50 touch-manipulation sm:size-7"
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
  currentDeviceKind = "desktop",
  isHost = false,
  triggerClassName,
  open: openControlled,
  onOpenChange,
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

  const [openInternal, setOpenInternal] = useState(false);
  const open = openControlled ?? openInternal;
  const setOpen = onOpenChange ?? setOpenInternal;
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
        onClick={() => setOpen(!open)}
        className={cn(
          toolbarControl,
          "inline-flex h-10 gap-1.5 px-2.5 py-0 sm:h-9",
          open && "border-foreground/25 bg-secondary",
          isHost && pendingMembers.length > 0 && "border-amber-500/50",
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
            "z-50 overflow-hidden rounded-xl border border-border bg-card shadow-none",
            "fixed inset-x-3 top-[calc(3.5rem+env(safe-area-inset-top,0px))] max-h-[min(70dvh,24rem)] overflow-y-auto overscroll-contain sm:inset-x-4",
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
                  deviceKind={
                    m.device_fingerprint === currentDeviceFingerprint
                      ? currentDeviceKind
                      : undefined
                  }
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
