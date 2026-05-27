"use client";

import { Check, ClipboardCheck, Copy, Smartphone } from "lucide-react";

import { MemberTagPicker } from "@/components/member-tag-picker";
import { Button } from "@/components/ui/button";
import type { ClipboardAssignee } from "@/lib/clipboard-assignee";
import { hasRichHtmlContent } from "@/lib/clipboard-html";
import type { ClipboardInboxItem } from "@/lib/clipboard-inbox-storage";
import type { RoomMember } from "@/lib/meetings";
import { paperCard } from "@/lib/ui";
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
  showAssignee?: boolean;
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
  showAssignee = true,
}: Props) {
  const from = sourceLabel(item);
  const copied = item.copiedToClipboard;
  const assignee = item.assignee;
  const richHtml = hasRichHtmlContent(item.html);
  const canAssign =
    showAssignee && members.length > 0 && Boolean(onAssigneeChange);

  return (
    <li
      className={cn(
        paperCard,
        "relative isolate z-0 flex min-w-0 flex-col gap-2.5 p-3 sm:p-4",
        isLatest && "paper-card--latest z-[1]",
        highlightCopy && "paper-card--highlight"
      )}
      aria-label={copied ? "Clipboard item, copied" : "Clipboard item"}
    >
      <div className="relative z-[1] flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:gap-2.5">
        {richHtml ? (
          <div
            className={cn(
              "clipboard-rich min-w-0 flex-1 line-clamp-3 font-[family-name:var(--font-display)] text-sm leading-relaxed text-foreground",
              "[&_p]:mb-1 [&_p:last-child]:mb-0",
              "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4"
            )}
            dangerouslySetInnerHTML={{ __html: item.html! }}
          />
        ) : (
          <p className="min-w-0 flex-1 line-clamp-3 whitespace-pre-wrap break-words font-[family-name:var(--font-display)] text-sm leading-relaxed text-foreground">
            {item.text}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 shrink-0 gap-1 self-end border-[#e5e1d8] bg-[#fdfcfa]/90 px-3 shadow-none hover:bg-white/90 sm:h-8 sm:px-2.5"
          aria-label={copied ? "Copy again" : "Copy to clipboard"}
          onClick={onCopy}
        >
          {copying ? (
            <Check className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <Copy className="size-3.5 shrink-0" aria-hidden />
          )}
          <span className="sr-only">
            {copied ? "Copy again" : "Copy to clipboard"}
          </span>
        </Button>
      </div>

      <div className="relative z-[1] flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 border-t border-[#e5e1d8]/90 pt-2 text-[11px] text-ink-muted">
        {isLatest && (
          <span className="rounded-sm border border-[#d9d4c8] bg-[#fdfcfa] px-1 py-px font-mono text-[10px] font-medium uppercase tracking-wide text-ink-muted">
            Latest
          </span>
        )}
        {from && (
          <span className="inline-flex max-w-full items-center gap-0.5 truncate">
            {item.source === "mobile" ? (
              <Smartphone className="size-2.5 shrink-0" aria-hidden />
            ) : null}
            {from}
            {item.author ? ` · ${item.author}` : ""}
          </span>
        )}
        {assignee && !canAssign && (
          <span className="inline-flex max-w-full items-center gap-0.5 truncate text-primary">
            <span aria-hidden>{assignee.avatar}</span>
            <span className="truncate">{assignee.displayName}</span>
          </span>
        )}
        <time
          className="tabular-nums"
          dateTime={new Date(item.at).toISOString()}
        >
          {new Date(item.at).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </time>
        {copied ? (
          <span className="inline-flex items-center gap-0.5 text-accent-foreground">
            <ClipboardCheck className="size-2.5 shrink-0" aria-hidden />
            Copied
          </span>
        ) : null}
      </div>

      {canAssign && onAssigneeChange && (
        <MemberTagPicker
          members={members}
          currentDeviceFingerprint={currentDeviceFingerprint}
          value={assignee}
          onChange={(next) => onAssigneeChange(item.id, next)}
          label=""
          className="relative z-[1] min-w-0 space-y-0 [&>p:first-child]:hidden"
        />
      )}
    </li>
  );
}
