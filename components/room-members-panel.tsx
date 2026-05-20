"use client";

import { ChevronDown, ChevronUp, GripVertical, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { RoomMember } from "@/lib/rooms";
import { getRoomMembers } from "@/lib/rooms";
import { cn } from "@/lib/utils";

type Props = {
  topic: string;
  deviceFingerprint: string;
  currentDeviceFingerprint: string;
};

const DEFAULT_MARGIN = 16;
const HEADER_OFFSET = 88;
const MAX_VISIBLE_AVATARS = 4;
const SCROLL_THRESHOLD = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sortMembers(
  members: RoomMember[],
  currentDeviceFingerprint: string
): RoomMember[] {
  return [...members].sort((a, b) => {
    const aYou = a.device_fingerprint === currentDeviceFingerprint;
    const bYou = b.device_fingerprint === currentDeviceFingerprint;
    if (aYou !== bYou) return aYou ? -1 : 1;
    return a.display_name.localeCompare(b.display_name, undefined, {
      sensitivity: "base",
    });
  });
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
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors",
        isYou ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-surface-elevated/80"
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full border text-base leading-none",
          isYou
            ? "border-primary/40 bg-primary/15 ring-1 ring-primary/25"
            : "border-border bg-card ring-1 ring-white/[0.04]"
        )}
        aria-hidden
      >
        {member.avatar ?? "🦊"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {member.display_name}
        </p>
        {isYou && (
          <p className="text-[11px] text-primary">You</p>
        )}
      </div>
    </li>
  );
}

function AvatarStack({
  members,
  total,
}: {
  members: RoomMember[];
  total: number;
}) {
  const shown = members.slice(0, MAX_VISIBLE_AVATARS);
  const overflow = total - shown.length;

  return (
    <div className="flex items-center -space-x-2" aria-hidden>
      {shown.map((m) => (
        <span
          key={m.device_fingerprint}
          className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-card text-sm leading-none ring-1 ring-border"
        >
          {m.avatar ?? "🦊"}
        </span>
      ))}
      {overflow > 0 && (
        <span className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-surface-elevated text-[10px] font-medium text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
}

export function RoomMembersPanel({
  topic,
  deviceFingerprint,
  currentDeviceFingerprint,
}: Props) {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [expanded, setExpanded] = useState(true);
  const panelRef = useRef<HTMLElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragging, setDragging] = useState(false);

  const sortedMembers = useMemo(
    () => sortMembers(members, currentDeviceFingerprint),
    [members, currentDeviceFingerprint]
  );

  const clampPosition = useCallback((x: number, y: number) => {
    const el = panelRef.current;
    const w = el?.offsetWidth ?? 224;
    const h = el?.offsetHeight ?? 120;
    const minY = HEADER_OFFSET;
    return {
      x: clamp(x, 0, Math.max(0, window.innerWidth - w)),
      y: clamp(y, minY, Math.max(minY, window.innerHeight - h)),
    };
  }, []);

  useEffect(() => {
    const placeDefault = () => {
      setPosition((prev) => {
        if (prev) {
          return clampPosition(prev.x, prev.y);
        }
        const el = panelRef.current;
        const w = el?.offsetWidth ?? 224;
        return {
          x: window.innerWidth - w - DEFAULT_MARGIN,
          y: HEADER_OFFSET,
        };
      });
    };

    placeDefault();
    window.addEventListener("resize", placeDefault);
    return () => window.removeEventListener("resize", placeDefault);
  }, [clampPosition]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      setPosition(
        clampPosition(
          e.clientX - dragOffset.current.x,
          e.clientY - dragOffset.current.y
        )
      );
    };

    const onUp = () => setDragging(false);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, clampPosition]);

  const onDragHandlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || position === null) return;
    e.preventDefault();
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    setDragging(true);
  };

  useEffect(() => {
    let cancelled = false;

    const load = () =>
      getRoomMembers(topic, deviceFingerprint)
        .then((data) => {
          if (!cancelled) setMembers(data);
        })
        .catch(() => {});

    load();
    const id = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [topic, deviceFingerprint]);

  useEffect(() => {
    setPosition((prev) => (prev ? clampPosition(prev.x, prev.y) : prev));
  }, [expanded, members.length, clampPosition]);

  if (members.length === 0) return null;

  const count = members.length;
  const needsScroll = count > SCROLL_THRESHOLD;

  return (
    <aside
      ref={panelRef}
      style={
        position
          ? { left: position.x, top: position.y, right: "auto" }
          : undefined
      }
      className={cn(
        "pointer-events-auto fixed z-40 w-56 overflow-hidden rounded-lg border border-border",
        "bg-card/95 shadow-none ring-1 ring-inset ring-white/[0.04] backdrop-blur-md",
        !position && "right-4 top-[88px]",
        dragging && "select-none"
      )}
      aria-label={`Participants, ${count} in room`}
    >
      <div
        className={cn(
          "flex items-center gap-1 border-b border-border bg-surface-elevated/40 px-2 py-1.5",
          "touch-none cursor-grab active:cursor-grabbing"
        )}
        onPointerDown={onDragHandlePointerDown}
      >
        <GripVertical
          className="size-4 shrink-0 text-muted-foreground/60"
          aria-hidden
        />
        <Users className="size-3.5 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
          In room
        </span>
        <span className="shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
          {count}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0 text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse participants" : "Expand participants"}
        >
          {expanded ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </Button>
      </div>

      {expanded ? (
        <ul
          role="list"
          className={cn(
            "space-y-0.5 p-2",
            needsScroll &&
              "max-h-[min(280px,40vh)] overflow-y-auto overscroll-contain [scrollbar-width:thin]"
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
      ) : (
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <AvatarStack members={sortedMembers} total={count} />
          <span className="text-[11px] text-muted-foreground">
            {count === 1 ? "1 person" : `${count} people`}
          </span>
        </div>
      )}
    </aside>
  );
}
