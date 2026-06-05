"use client";

import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { threadCopy } from "@/lib/hook-copy";
import { input, touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  onSubmit: (text: string) => void;
  onCancel: () => void;
  className?: string;
};

export function BoardReplyComposer({
  onSubmit,
  onCancel,
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
        "rounded-lg border border-border/80 bg-surface-elevated/40 p-2",
        className
      )}
    >
      <label htmlFor={textareaId} className="sr-only">
        {threadCopy.replyPlaceholder}
      </label>
      <textarea
        ref={textareaRef}
        id={textareaId}
        rows={2}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={threadCopy.replyPlaceholder}
        className={cn(input, "min-h-[3.25rem] resize-none py-2 text-sm")}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="mt-1.5 flex items-center justify-end gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(touchTarget, "h-8 px-2 text-xs")}
          onClick={onCancel}
        >
          {threadCopy.cancel}
        </Button>
        <Button
          type="button"
          size="sm"
          className={cn(touchTarget, "h-8 px-2.5 text-xs")}
          disabled={!text.trim()}
          onClick={handleSubmit}
        >
          {threadCopy.postReply}
        </Button>
      </div>
    </div>
  );
}
