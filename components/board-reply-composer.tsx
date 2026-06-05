"use client";

import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { threadCopy } from "@/lib/hook-copy";
import { input, touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  onSubmit: (text: string) => void;
  onCancel: () => void;
  depth?: number;
  className?: string;
};

export function BoardReplyComposer({
  onSubmit,
  onCancel,
  depth = 0,
  className,
}: Props) {
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText("");
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/95 p-2.5 sm:p-3",
        depth > 0 && "ml-0",
        className
      )}
    >
      <label htmlFor={textareaId} className="sr-only">
        {threadCopy.replyPlaceholder}
      </label>
      <textarea
        ref={textareaRef}
        id={textareaId}
        rows={3}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={threadCopy.replyPlaceholder}
        className={cn(input, "min-h-[4.5rem] resize-y py-2.5 text-sm")}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(touchTarget, "h-9 px-3 text-xs")}
          onClick={onCancel}
        >
          {threadCopy.cancel}
        </Button>
        <Button
          type="button"
          size="sm"
          className={cn(touchTarget, "h-9 px-3 text-xs")}
          disabled={!text.trim()}
          onClick={handleSubmit}
        >
          {threadCopy.postReply}
        </Button>
      </div>
    </div>
  );
}
