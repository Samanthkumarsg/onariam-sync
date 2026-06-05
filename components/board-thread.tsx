"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

import { ClipboardBoardItemCard } from "@/components/clipboard-board-item";
import { BoardReplyComposer } from "@/components/board-reply-composer";
import type { ClipboardAssignee } from "@/lib/clipboard-assignee";
import type { ClipboardBoardItem } from "@/lib/clipboard-inbox-storage";
import {
  countThreadReplies,
  getDirectReplies,
  isInThreadBranch,
} from "@/lib/board-threads";
import { threadCopy } from "@/lib/hook-copy";
import type { RoomMember } from "@/lib/meetings";
import { btnGhost, touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  root: ClipboardBoardItem;
  allItems: ClipboardBoardItem[];
  depth?: number;
  isLatest?: boolean;
  highlightCopy?: boolean;
  copyingId?: string | null;
  members: RoomMember[];
  currentDeviceFingerprint: string;
  replyingToId: string | null;
  onReplyClick: (itemId: string) => void;
  onSubmitReply: (parentId: string, text: string) => void;
  onCancelReply: () => void;
  onAssigneeChange?: (id: string, assignee: ClipboardAssignee | null) => void;
  onCopy: (item: ClipboardBoardItem) => void;
  showAssignee?: boolean;
};

export function BoardThread({
  root,
  allItems,
  depth = 0,
  isLatest = false,
  highlightCopy = false,
  copyingId = null,
  members,
  currentDeviceFingerprint,
  replyingToId,
  onReplyClick,
  onSubmitReply,
  onCancelReply,
  onAssigneeChange,
  onCopy,
  showAssignee = true,
}: Props) {
  const replies = getDirectReplies(allItems, root.id);
  const threadReplyCount =
    depth === 0 ? countThreadReplies(allItems, root.id) : 0;
  const nestedReplyCount = replies.length;
  const isReply = depth > 0;
  const isRoot = depth === 0;
  const [repliesOpen, setRepliesOpen] = useState(
    isRoot ? threadReplyCount <= 1 : true
  );

  useEffect(() => {
    if (!isRoot || !replyingToId) return;
    if (isInThreadBranch(allItems, root.id, replyingToId)) {
      setRepliesOpen(true);
    }
  }, [allItems, isRoot, replyingToId, root.id]);

  const showReplies = !isRoot || repliesOpen;

  return (
    <li
      className={cn(
        "flex min-w-0 flex-col gap-1.5",
        isReply && "relative min-w-0"
      )}
    >
      <ClipboardBoardItemCard
        item={root}
        isLatest={isLatest && isRoot}
        highlightCopy={highlightCopy}
        copying={copyingId === root.id}
        members={members}
        currentDeviceFingerprint={currentDeviceFingerprint}
        onAssigneeChange={onAssigneeChange}
        onCopy={() => onCopy(root)}
        showAssignee={showAssignee && isRoot}
        isReply={isReply}
        replyDepth={depth}
        threadReplyCount={threadReplyCount}
        nestedReplyCount={isReply ? nestedReplyCount : 0}
        onReply={() => onReplyClick(root.id)}
        replyOpen={replyingToId === root.id}
      />

      {replyingToId === root.id && (
        <BoardReplyComposer
          className={cn(isReply && "ml-0.5 sm:ml-1")}
          onSubmit={(text) => onSubmitReply(root.id, text)}
          onCancel={onCancelReply}
        />
      )}

      {isRoot && threadReplyCount > 0 && (
        <button
          type="button"
          onClick={() => setRepliesOpen((open) => !open)}
          className={cn(
            btnGhost,
            touchTarget,
            "inline-flex h-8 w-fit items-center gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          )}
          aria-expanded={repliesOpen}
        >
          {repliesOpen ? (
            <>
              <ChevronUp className="size-3 shrink-0" aria-hidden />
              {threadCopy.hideReplies}
            </>
          ) : (
            <>
              <ChevronDown className="size-3 shrink-0" aria-hidden />
              {threadCopy.showReplies(threadReplyCount)}
            </>
          )}
        </button>
      )}

      {showReplies && replies.length > 0 && (
        <ul
          className={cn(
            "flex min-w-0 flex-col gap-1.5 border-l-2 border-border/70",
            isRoot
              ? "ml-3 pl-2.5 sm:ml-4 sm:pl-3"
              : "ml-2 pl-2 sm:ml-2.5 sm:pl-2.5"
          )}
          aria-label={isRoot ? "Replies" : "Sub-replies"}
        >
          {replies.map((reply) => (
            <BoardThread
              key={reply.id}
              root={reply}
              allItems={allItems}
              depth={depth + 1}
              copyingId={copyingId}
              members={members}
              currentDeviceFingerprint={currentDeviceFingerprint}
              replyingToId={replyingToId}
              onReplyClick={onReplyClick}
              onSubmitReply={onSubmitReply}
              onCancelReply={onCancelReply}
              onAssigneeChange={onAssigneeChange}
              onCopy={onCopy}
              showAssignee={false}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
