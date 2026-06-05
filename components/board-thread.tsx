"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

import { ClipboardBoardItemCard } from "@/components/clipboard-board-item";
import { BoardReplyComposer } from "@/components/board-reply-composer";
import type { ClipboardAssignee } from "@/lib/clipboard-assignee";
import type { ClipboardBoardItem } from "@/lib/clipboard-inbox-storage";
import {
  countThreadReplies,
  getThreadReplyList,
} from "@/lib/board-threads";
import { threadCopy } from "@/lib/hook-copy";
import type { RoomMember } from "@/lib/meetings";
import { btnGhost, touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  root: ClipboardBoardItem;
  allItems: ClipboardBoardItem[];
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
  const replies = getThreadReplyList(allItems, root.id);
  const threadReplyCount = countThreadReplies(allItems, root.id);
  const [repliesOpen, setRepliesOpen] = useState(threadReplyCount <= 1);

  useEffect(() => {
    if (
      replyingToId &&
      (replyingToId === root.id || replies.some((r) => r.id === replyingToId))
    ) {
      setRepliesOpen(true);
    }
  }, [replyingToId, root.id, replies]);

  return (
    <li className="flex min-w-0 flex-col gap-1.5">
      <ClipboardBoardItemCard
        item={root}
        isLatest={isLatest}
        highlightCopy={highlightCopy}
        copying={copyingId === root.id}
        members={members}
        currentDeviceFingerprint={currentDeviceFingerprint}
        onAssigneeChange={onAssigneeChange}
        onCopy={() => onCopy(root)}
        showAssignee={showAssignee}
        threadReplyCount={threadReplyCount}
        onReply={() => onReplyClick(root.id)}
        replyOpen={replyingToId === root.id}
      />

      {replyingToId === root.id && (
        <BoardReplyComposer
          onSubmit={(text) => onSubmitReply(root.id, text)}
          onCancel={onCancelReply}
        />
      )}

      {threadReplyCount > 0 && (
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

      {repliesOpen && replies.length > 0 && (
        <ul
          className="flex min-w-0 flex-col gap-1.5 border-l border-border/60 pl-2.5 sm:pl-3"
          aria-label="Replies"
        >
          {replies.map((reply) => (
            <li key={reply.id} className="flex min-w-0 flex-col gap-1.5">
              <ClipboardBoardItemCard
                item={reply}
                isLatest={false}
                copying={copyingId === reply.id}
                members={members}
                currentDeviceFingerprint={currentDeviceFingerprint}
                onCopy={() => onCopy(reply)}
                showAssignee={false}
                isReply
                onReply={() => onReplyClick(reply.id)}
                replyOpen={replyingToId === reply.id}
              />

              {replyingToId === reply.id && (
                <BoardReplyComposer
                  onSubmit={(text) => onSubmitReply(reply.id, text)}
                  onCancel={onCancelReply}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
