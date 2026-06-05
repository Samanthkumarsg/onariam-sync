"use client";

import { ClipboardBoardItemCard } from "@/components/clipboard-board-item";
import { BoardReplyComposer } from "@/components/board-reply-composer";
import type { ClipboardAssignee } from "@/lib/clipboard-assignee";
import type { ClipboardBoardItem } from "@/lib/clipboard-inbox-storage";
import {
  countThreadReplies,
  getDirectReplies,
} from "@/lib/board-threads";
import type { RoomMember } from "@/lib/meetings";
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
  const threadReplyCount = depth === 0 ? countThreadReplies(allItems, root.id) : 0;
  const isReply = depth > 0;

  return (
    <li
      className={cn(
        "flex min-w-0 flex-col gap-2",
        depth > 0 && "relative"
      )}
    >
      <ClipboardBoardItemCard
        item={root}
        isLatest={isLatest && depth === 0}
        highlightCopy={highlightCopy}
        copying={copyingId === root.id}
        members={members}
        currentDeviceFingerprint={currentDeviceFingerprint}
        onAssigneeChange={onAssigneeChange}
        onCopy={() => onCopy(root)}
        showAssignee={showAssignee && depth === 0}
        isReply={isReply}
        threadReplyCount={threadReplyCount}
        onReply={() => onReplyClick(root.id)}
        replyOpen={replyingToId === root.id}
      />

      {replyingToId === root.id && (
        <BoardReplyComposer
          depth={depth}
          onSubmit={(text) => onSubmitReply(root.id, text)}
          onCancel={onCancelReply}
        />
      )}

      {replies.length > 0 && (
        <ul
          className={cn(
            "flex min-w-0 flex-col gap-2 border-l-2 border-border/70",
            depth === 0 ? "ml-4 pl-3 sm:ml-5 sm:pl-4" : "ml-3 pl-2.5 sm:ml-4 sm:pl-3"
          )}
          aria-label="Replies"
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
