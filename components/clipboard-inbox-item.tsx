"use client";

import {
  Check,
  ClipboardCheck,
  Copy,
  Download,
  FileIcon,
  MessageSquare,
  Smartphone,
} from "lucide-react";

import { MemberTagPicker } from "@/components/member-tag-picker";
import { Button } from "@/components/ui/button";
import type { ClipboardAssignee } from "@/lib/clipboard-assignee";
import { resolveItemAuthor } from "@/lib/clipboard-author";
import type { ClipboardBoardItem } from "@/lib/clipboard-inbox-storage";
import { isFilePayload } from "@/lib/clipboard-p2p";
import { fileTransferCopy, threadCopy } from "@/lib/hook-copy";
import { formatFileSize } from "@/lib/ipfs";
import type { RoomMember } from "@/lib/meetings";
import { btnGhost, paperCard, touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  item: ClipboardBoardItem;
  isLatest: boolean;
  highlightCopy?: boolean;
  copying?: boolean;
  members: RoomMember[];
  currentDeviceFingerprint: string;
  onAssigneeChange?: (id: string, assignee: ClipboardAssignee | null) => void;
  onCopy: () => void;
  showAssignee?: boolean;
  isReply?: boolean;
  threadReplyCount?: number;
  onReply?: () => void;
  replyOpen?: boolean;
};

function sourceLabel(item: ClipboardBoardItem) {
  if (item.source === "host") return "Host";
  if (item.source === "desktop") return "Desktop";
  if (item.source === "mobile") return "Phone";
  return null;
}

export function ClipboardBoardItemCard({
  item,
  isLatest,
  highlightCopy,
  copying,
  members,
  currentDeviceFingerprint,
  onAssigneeChange,
  onCopy,
  showAssignee = true,
  isReply = false,
  threadReplyCount = 0,
  onReply,
  replyOpen = false,
}: Props) {
  const from = sourceLabel(item);
  const copied = item.copiedToClipboard;
  const assignee = item.assignee;
  const author = resolveItemAuthor(item, members);
  const canAssign =
    showAssignee && members.length > 0 && Boolean(onAssigneeChange);
  const isFile = isFilePayload(item);

  return (
    <article
      className={cn(
        paperCard,
        "relative z-0 flex min-w-0 flex-col",
        isReply ? "gap-1.5 p-2" : "gap-2.5 p-3 sm:p-4",
        isLatest && !isReply && "paper-card--latest z-[1]",
        highlightCopy && "paper-card--highlight",
        replyOpen && "ring-2 ring-primary/20"
      )}
      aria-label={
        isFile
          ? `File from ${author.displayName}`
          : isReply
            ? `Reply from ${author.displayName}`
            : copied
              ? `Pasted by ${author.displayName}, copied`
              : `Pasted by ${author.displayName}`
      }
    >
      <div className="relative z-[1] flex min-w-0 gap-2">
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-surface-elevated leading-none",
            isReply
              ? "size-7 text-sm"
              : "size-10 text-xl sm:size-9 sm:text-lg"
          )}
          title={author.displayName}
          aria-hidden
        >
          {author.emoji}
        </span>
        <div
          className={cn(
            "flex min-w-0 flex-1 gap-1.5",
            isReply ? "items-start" : "flex-col gap-2 sm:flex-row sm:items-start sm:gap-2.5"
          )}
        >
          {isFile ? (
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <FileIcon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-[family-name:var(--font-display)] text-sm font-medium text-foreground">
                  {item.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatFileSize(item.size)}
                  <span className="mx-1">·</span>
                  <span className="font-mono">{fileTransferCopy.ipfsCid}</span>
                  <span className="ml-1 truncate">{item.cid.slice(0, 12)}…</span>
                </p>
              </div>
            </div>
          ) : item.html ? (
            <div
              className={cn(
                "clipboard-rich min-w-0 flex-1 font-[family-name:var(--font-display)] leading-relaxed text-foreground",
                isReply ? "text-xs line-clamp-2" : "text-sm line-clamp-3",
                "[&_p]:mb-1 [&_p:last-child]:mb-0",
                "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4"
              )}
              dangerouslySetInnerHTML={{ __html: item.html }}
            />
          ) : (
            <p
              className={cn(
                "min-w-0 flex-1 whitespace-pre-wrap break-words font-[family-name:var(--font-display)] leading-relaxed text-foreground",
                isReply ? "text-xs line-clamp-2" : "text-sm line-clamp-3"
              )}
            >
              {item.text}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "shrink-0 gap-1 self-start",
              isReply ? "size-7 px-0 sm:size-7" : "h-10 self-end sm:h-8 sm:px-2.5"
            )}
            aria-label={
              isFile
                ? fileTransferCopy.download
                : copied
                  ? "Copy again"
                  : "Copy to clipboard"
            }
            onClick={onCopy}
          >
            {copying ? (
              <Check className="size-3.5 shrink-0" aria-hidden />
            ) : isFile ? (
              <Download className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <Copy className="size-3.5 shrink-0" aria-hidden />
            )}
            <span className="sr-only">
              {isFile
                ? fileTransferCopy.download
                : copied
                  ? "Copy again"
                  : "Copy to clipboard"}
            </span>
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "relative z-[1] flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-ink-muted",
          isReply
            ? "pl-9"
            : "border-t border-[color:var(--paper-divider)]/90 pt-2 pl-[2.875rem] sm:pl-12"
        )}
      >
        {isLatest && !isReply && (
          <span className="rounded-sm border border-[color:var(--paper-badge-border)] bg-[color:var(--paper-badge-bg)] px-1 py-px font-mono text-[10px] font-medium uppercase tracking-wide text-ink-muted">
            Latest
          </span>
        )}
        <span className="inline-flex max-w-full items-center gap-1 truncate font-medium text-foreground/90">
          <span className="truncate">{author.displayName}</span>
        </span>
        {from && !isReply && (
          <span className="inline-flex max-w-full items-center gap-0.5 truncate">
            {item.source === "mobile" ? (
              <Smartphone className="size-2.5 shrink-0" aria-hidden />
            ) : null}
            {from}
          </span>
        )}
        {threadReplyCount > 0 && !isReply && (
          <span className="text-muted-foreground">
            {threadCopy.replies(threadReplyCount)}
          </span>
        )}
        {assignee && !canAssign && (
          <span className="inline-flex max-w-full items-center gap-0.5 truncate text-primary">
            <span aria-hidden>{assignee.avatar}</span>
            <span className="truncate">{assignee.displayName}</span>
          </span>
        )}
        <time
          className="shrink-0 tabular-nums"
          dateTime={new Date(item.at).toISOString()}
        >
          {isReply
            ? new Date(item.at).toLocaleString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })
            : new Date(item.at).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
        </time>
        {copied && !isFile ? (
          <span className="inline-flex items-center gap-0.5 text-accent-foreground">
            <ClipboardCheck className="size-2.5 shrink-0" aria-hidden />
            Copied
          </span>
        ) : null}
        {onReply && (
          <button
            type="button"
            onClick={onReply}
            className={cn(
              btnGhost,
              touchTarget,
              "inline-flex items-center gap-1 px-1.5",
              isReply ? "h-7 text-[10px]" : "ml-auto h-8 px-2",
              replyOpen && "bg-surface-elevated text-foreground"
            )}
            aria-expanded={replyOpen}
          >
            <MessageSquare className="size-3 shrink-0" aria-hidden />
            {!isReply && threadCopy.reply}
          </button>
        )}
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
    </article>
  );
}

/** @deprecated Use ClipboardBoardItemCard */
export const ClipboardInboxItemCard = ClipboardBoardItemCard;
