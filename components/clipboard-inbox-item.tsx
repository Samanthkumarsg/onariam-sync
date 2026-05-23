"use client";

import { Check, ClipboardCheck, Copy, Smartphone, UserRound } from "lucide-react";

import { MemberTagPicker } from "@/components/member-tag-picker";
import { Button } from "@/components/ui/button";
import type { ClipboardAssignee } from "@/lib/clipboard-assignee";
import type { ClipboardInboxItem } from "@/lib/clipboard-inbox-storage";
import type { RoomMember } from "@/lib/meetings";
import { panel } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  item: ClipboardInboxItem;
  isLatest: boolean;
  highlightCopy?: boolean;
  copying?: boolean;
  members: RoomMember[];
  currentDeviceFingerprint: string;
  onAssigneeChange?: (id: string, assignee: ClipboardAssignee | null) => void;
  onCopy: () => void;
};

function sourceLabel(item: ClipboardInboxItem) {
  if (item.source === "host") return "Host";
  if (item.source === "desktop") return "Desktop";
  if (item.source === "mobile") return "Phone";
  return null;
}

export function ClipboardInboxItemCard({
  item,
  isLatest,
  highlightCopy,
  copying,
  members,
  currentDeviceFingerprint,
  onAssigneeChange,
  onCopy,
}: Props) {
  const from = sourceLabel(item);
  const copied = item.copiedToClipboard;
  const assignee = item.assignee;
  const canAssign = members.length > 0 && onAssigneeChange;

  return (
    <li
      className={cn(
        panel,
        "relative flex flex-col gap-3 p-3.5 transition-shadow sm:p-5",
        isLatest && "border-primary/25 ring-1 ring-primary/15",
        copied &&
          "border-l-[3px] border-l-emerald-500/80 pl-[calc(0.875rem-3px)] sm:pl-[calc(1.25rem-3px)]",
        highlightCopy && "ring-2 ring-emerald-500/40",
        !copied && "border-l-[3px] border-l-transparent"
      )}
      aria-label={copied ? "Clipboard item, copied" : "Clipboard item, not copied yet"}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {isLatest && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Latest
            </span>
          )}
          {from && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {item.source === "mobile" ? (
                <Smartphone className="size-3" aria-hidden />
              ) : null}
              {from}
              {item.author ? ` · ${item.author}` : ""}
            </span>
          )}
          {assignee && !canAssign && (
            <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <span aria-hidden>{assignee.avatar}</span>
              <span className="truncate">{assignee.displayName}</span>
            </span>
          )}
        </div>

        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            copied
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
              : "border-border bg-surface-elevated text-muted-foreground"
          )}
          title={copied ? "Copied to your system clipboard" : "Not copied yet"}
        >
          {copied ? (
            <>
              <ClipboardCheck className="size-3" aria-hidden />
              Copied
            </>
          ) : (
            "Not copied"
          )}
        </span>
      </div>

      {item.html ? (
        <div
          className={cn(
            "clipboard-rich text-sm leading-relaxed text-foreground sm:text-[15px]",
            "[&_p]:mb-2 [&_p:last-child]:mb-0",
            "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
          )}
          dangerouslySetInnerHTML={{ __html: item.html }}
        />
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground sm:text-[15px]">
          {item.text}
        </p>
      )}

      {canAssign && (
        <div className="rounded-lg border border-border/80 bg-surface-elevated/40 p-2.5 sm:p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <UserRound className="size-3.5 shrink-0" aria-hidden />
            Tag for
          </p>
          <MemberTagPicker
            members={members}
            currentDeviceFingerprint={currentDeviceFingerprint}
            value={assignee}
            onChange={(next) => onAssigneeChange(item.id, next)}
            label=""
            className="space-y-0"
          />
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border/80 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <time
          className="text-xs tabular-nums text-muted-foreground"
          dateTime={new Date(item.at).toISOString()}
        >
          {new Date(item.at).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </time>
        <Button
          type="button"
          variant={copying ? "secondary" : copied ? "secondary" : "outline"}
          size="sm"
          className="h-11 w-full touch-manipulation sm:h-9 sm:min-w-[5.5rem] sm:w-auto"
          onClick={onCopy}
        >
          {copying ? (
            <>
              <Check className="size-4 shrink-0" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-4 shrink-0" aria-hidden />
              {copied ? "Copy again" : "Copy"}
            </>
          )}
        </Button>
      </div>
    </li>
  );
}
