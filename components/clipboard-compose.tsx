"use client";

import { ClipboardPaste, Plus, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import {
  ClipboardEditor,
  type ClipboardEditorValue,
} from "@/components/clipboard-editor";
import { MemberTagPicker } from "@/components/member-tag-picker";
import { Button } from "@/components/ui/button";
import { isEmptyEditorHtml, plainTextFromHtml } from "@/lib/clipboard-html";
import type { ClipboardAssignee } from "@/lib/clipboard-assignee";
import { createClipboardPayload } from "@/lib/clipboard-p2p";
import type { ClipboardInboxItem } from "@/lib/clipboard-inbox-storage";
import type { RoomMember } from "@/lib/meetings";
import { touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  isHost: boolean;
  displayName: string;
  deviceFingerprint: string;
  members: RoomMember[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Increment to open the panel and paste from the system clipboard. */
  pasteTrigger?: number;
  onAdd: (item: ClipboardInboxItem) => void;
  onBroadcast?: (item: ClipboardInboxItem) => void;
  showAssignee?: boolean;
  className?: string;
};

export function ClipboardCompose({
  isHost,
  displayName,
  deviceFingerprint,
  members,
  open: openControlled,
  onOpenChange,
  pasteTrigger,
  onAdd,
  onBroadcast,
  showAssignee = true,
  className,
}: Props) {
  const panelId = useId();
  const [openInternal, setOpenInternal] = useState(false);
  const open = openControlled ?? openInternal;
  const setOpen = onOpenChange ?? setOpenInternal;

  const [draft, setDraft] = useState<ClipboardEditorValue>({
    html: "",
    text: "",
  });
  const [editorKey, setEditorKey] = useState(0);
  const [editorSeed, setEditorSeed] = useState("");
  const [assignee, setAssignee] = useState<ClipboardAssignee | null>(null);

  const pasteFromSystem = useCallback(async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip) return false;
      const html = `<p>${clip
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>")}</p>`;
      setDraft({ text: clip, html });
      setEditorSeed(html);
      setEditorKey((k) => k + 1);
      return true;
    } catch {
      return false;
    }
  }, []);

  const openAndPaste = useCallback(async () => {
    setOpen(true);
    await pasteFromSystem();
  }, [pasteFromSystem, setOpen]);

  useEffect(() => {
    if (!pasteTrigger) return;
    void openAndPaste();
  }, [pasteTrigger, openAndPaste]);

  const resetEditor = () => {
    setDraft({ html: "", text: "" });
    setEditorSeed("");
    setEditorKey((k) => k + 1);
    setAssignee(null);
  };

  const handleAdd = () => {
    if (isEmptyEditorHtml(draft.html) && !draft.text.trim()) return;

    const text = draft.text.trim() || plainTextFromHtml(draft.html);
    const base = createClipboardPayload(text, {
      html: draft.html,
      source: isHost ? "host" : "desktop",
      author: displayName,
      assignee,
    });

    const item: ClipboardInboxItem = {
      ...base,
      copiedToClipboard: false,
      assignee,
    };

    onAdd(item);
    onBroadcast?.(item);
    resetEditor();
    setOpen(false);
  };

  const canAdd =
    draft.text.trim().length > 0 || !isEmptyEditorHtml(draft.html);

  return (
    <div className={cn("min-w-0 shrink-0", className)}>
      {!open ? (
        <Button
          type="button"
          variant="default"
          size="sm"
          className={cn(touchTarget, "h-11 w-full gap-1.5 px-3 sm:h-9 sm:w-auto")}
          onClick={() => void openAndPaste()}
        >
          <ClipboardPaste className="size-3.5 shrink-0" aria-hidden />
          Add to inbox
        </Button>
      ) : (
        <div
          className={cn(
            "overflow-hidden rounded-md border border-border bg-card transition-shadow duration-300",
            "ring-1 ring-primary/20 shadow-md shadow-primary/5"
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Add to inbox
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(
                touchTarget,
                "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
              )}
              aria-label="Close editor"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>

          <div
            id={panelId}
            className="compose-panel-in-active flex flex-col gap-2.5 px-3 pb-3 pt-2.5 sm:gap-3 sm:px-3.5 sm:pb-3.5"
          >
            <ClipboardEditor
              key={editorKey}
              initialContent={editorSeed}
              placeholder="Paste or compose…"
              minHeightClassName="min-h-[88px] sm:min-h-[100px]"
              onChange={setDraft}
              onPasteFromClipboard={() => void pasteFromSystem()}
            />

            {showAssignee && (
              <MemberTagPicker
                members={members}
                currentDeviceFingerprint={deviceFingerprint}
                value={assignee}
                onChange={setAssignee}
                className="space-y-1.5 [&_button]:min-h-7"
              />
            )}

            <Button
              type="button"
              size="sm"
              className={cn(touchTarget, "h-11 w-full sm:h-9 sm:w-auto sm:self-end")}
              disabled={!canAdd}
              onClick={handleAdd}
            >
              <Plus className="size-3.5 shrink-0" aria-hidden />
              Save to inbox
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
