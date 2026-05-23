"use client";

import type { RoomMember } from "@/lib/meetings";
import type { ClipboardAssignee } from "@/lib/clipboard-assignee";
import { cn } from "@/lib/utils";

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

export function MemberTagPicker({
  members,
  currentDeviceFingerprint,
  value,
  onChange,
  label = "Assign to",
  className,
}: Props) {
  const approved = members.filter((m) => m.status === "approved");

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "inline-flex min-h-8 items-center rounded-full border px-2.5 text-xs font-medium transition-all touch-manipulation",
            "hover:border-border hover:bg-surface-elevated",
            value == null
              ? "border-primary/50 bg-primary/15 text-primary scale-[1.02]"
              : "border-border bg-card text-muted-foreground"
          )}
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
              className={cn(
                "inline-flex min-h-8 max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-all touch-manipulation",
                "hover:border-border hover:bg-surface-elevated",
                selected
                  ? "border-primary/50 bg-primary/15 text-primary scale-[1.02] shadow-sm shadow-primary/10"
                  : "border-border bg-card text-foreground"
              )}
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
