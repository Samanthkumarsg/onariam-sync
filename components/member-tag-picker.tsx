"use client";

import type { RoomMember } from "@/lib/meetings";
import type { ClipboardAssignee } from "@/lib/clipboard-assignee";
import { cn } from "@/lib/utils";

const SCROLL_CHIP_THRESHOLD = 5;

type Props = {
  members: RoomMember[];
  currentDeviceFingerprint: string;
  value?: ClipboardAssignee | null;
  onChange: (assignee: ClipboardAssignee | null) => void;
  label?: string;
  className?: string;
};

function toAssignee(member: RoomMember): ClipboardAssignee {
  return {
    deviceFingerprint: member.device_fingerprint,
    displayName: member.display_name,
    avatar: member.avatar ?? "🦊",
  };
}

const chipClass = (selected: boolean) =>
  cn(
    "inline-flex min-h-9 items-center rounded-full border px-2.5 text-xs font-medium transition-all touch-manipulation sm:min-h-8",
    "hover:border-border hover:bg-surface-elevated",
    selected
      ? "border-primary/50 bg-primary/15 text-primary"
      : "border-border bg-card text-foreground"
  );

export function MemberTagPicker({
  members,
  currentDeviceFingerprint,
  value,
  onChange,
  label = "Assign to",
  className,
}: Props) {
  const approved = members.filter((m) => m.status === "approved");
  const useSelect = approved.length > SCROLL_CHIP_THRESHOLD;

  if (useSelect) {
    const selectValue = value?.deviceFingerprint ?? "";
    return (
      <div className={cn("space-y-1.5", className)}>
        {label ? (
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
        ) : null}
        <select
          className={cn(
            "h-11 w-full min-w-0 rounded-md border border-border bg-card px-3 text-sm text-foreground sm:h-10",
            "touch-manipulation focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          )}
          value={selectValue}
          onChange={(e) => {
            const fp = e.target.value;
            if (!fp) {
              onChange(null);
              return;
            }
            const member = approved.find((m) => m.device_fingerprint === fp);
            if (member) onChange(toAssignee(member));
          }}
          aria-label={label || "Assign to teammate"}
        >
          <option value="">Everyone</option>
          {approved.map((member) => {
            const isYou =
              member.device_fingerprint === currentDeviceFingerprint;
            return (
              <option key={member.device_fingerprint} value={member.device_fingerprint}>
                {isYou ? "You" : member.display_name}
              </option>
            );
          })}
        </select>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      ) : null}
      <div className="chip-scroll-row">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={chipClass(value == null)}
        >
          Everyone
        </button>
        {approved.map((member) => {
          const selected =
            value?.deviceFingerprint === member.device_fingerprint;
          const isYou = member.device_fingerprint === currentDeviceFingerprint;

          return (
            <button
              key={member.device_fingerprint}
              type="button"
              onClick={() => onChange(toAssignee(member))}
              className={cn(chipClass(selected), "max-w-[10rem] gap-1 py-0.5")}
              title={member.display_name}
            >
              <span className="text-sm leading-none" aria-hidden>
                {member.avatar ?? "🦊"}
              </span>
              <span className="truncate">
                {isYou ? "You" : member.display_name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
