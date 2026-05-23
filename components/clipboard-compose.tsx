"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useCallback, useId, useState } from "react";

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
import { panel } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  isHost: boolean;
  displayName: string;
  deviceFingerprint: string;
  members: RoomMember[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAdd: (item: ClipboardInboxItem) => void;
  onBroadcast?: (item: ClipboardInboxItem) => void;
  className?: string;
};

export function ClipboardCompose({
  isHost,
  displayName,
  deviceFingerprint,
  members,
  open: openControlled,
  onOpenChange,
  onAdd,
  onBroadcast,
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
      if (!clip) return;
      const html = `<p>${clip
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>")}</p>`;
      setDraft({ text: clip, html });
      setEditorSeed(html);
      setEditorKey((k) => k + 1);
      if (!open) setOpen(true);
    } catch {
      /* denied */
    }
  }, [open, setOpen]);

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

  const canAdd = draft.text.trim().length > 0;

  return (
    <div
      className={cn(
        panel,
        "overflow-hidden p-0 transition-shadow duration-300",
        open && "ring-1 ring-primary/20 shadow-md shadow-primary/5",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors touch-manipulation sm:px-4",
          "hover:bg-surface-elevated/60 active:scale-[0.995]",
          open && "bg-surface-elevated/40"
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-300",
              open
                ? "border-primary/40 bg-primary/15 text-primary rotate-0"
                : "border-border bg-card text-muted-foreground"
            )}
          >
            <Plus
              className={cn(
                "size-4 transition-transform duration-300",
                open && "rotate-90"
              )}
              aria-hidden
            />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              Add to inbox
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {open
                ? isHost
                  ? "Host paste · assign a tag"
                  : "Compose · assign a tag"
                : "Tap to paste or compose"}
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out",
            open && "rotate-180 text-primary"
          )}
          aria-hidden
        />
      </button>

      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "compose-panel-in flex flex-col gap-3 border-t border-border px-3.5 pb-3.5 pt-3 sm:gap-4 sm:px-4 sm:pb-4",
              open && "compose-panel-in-active"
            )}
          >
            <ClipboardEditor
              key={editorKey}
              initialContent={editorSeed}
              placeholder="Paste or compose with formatting…"
              minHeightClassName="min-h-[100px] sm:min-h-[120px]"
              onChange={setDraft}
              onPasteFromClipboard={() => void pasteFromSystem()}
            />

            <MemberTagPicker
              members={members}
              currentDeviceFingerprint={deviceFingerprint}
              value={assignee}
              onChange={setAssignee}
            />

            <Button
              type="button"
              className="h-11 w-full touch-manipulation sm:h-10 sm:w-auto sm:self-end"
              disabled={!canAdd}
              onClick={handleAdd}
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              Save to inbox
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
