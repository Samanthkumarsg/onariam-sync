"use client";

import { Plus, X } from "lucide-react";
import { useCallback, useId, useState } from "react";

import { PasteFab } from "@/components/paste-fab";
import {
  ClipboardEditor,
  type ClipboardEditorValue,
} from "@/components/clipboard-editor";
import { MemberTagPicker } from "@/components/member-tag-picker";
import { Button } from "@/components/ui/button";
import {
  isEmptyEditorHtml,
  plainTextFromHtml,
  textToEscapedHtml,
} from "@/lib/clipboard-html";
import { readSystemClipboardText } from "@/lib/clipboard-read";
import type { AvatarId } from "@/lib/avatars";
import { getAvatarEmoji } from "@/lib/avatars";
import type { ClipboardAssignee } from "@/lib/clipboard-assignee";
import { createClipboardPayload } from "@/lib/clipboard-p2p";
import type { ClipboardBoardItem } from "@/lib/clipboard-inbox-storage";
import type { RoomMember } from "@/lib/meetings";
import { touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  isHost: boolean;
  displayName: string;
  avatarId: AvatarId;
  deviceFingerprint: string;
  members: RoomMember[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAdd: (item: ClipboardBoardItem) => void;
  onBroadcast?: (item: ClipboardBoardItem) => void;
  showAssignee?: boolean;
  className?: string;
  /** When true, show floating Paste control (board has items or desktop). */
  floatingFab?: boolean;
  /** Fired after double-tap quick paste succeeds */
  onQuickPaste?: () => void;
};

export function ClipboardCompose({
  isHost,
  displayName,
  avatarId,
  deviceFingerprint,
  members,
  open: openControlled,
  onOpenChange,
  onAdd,
  onBroadcast,
  showAssignee = true,
  className,
  floatingFab = true,
  onQuickPaste,
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

  const applyClipboardText = useCallback((clip: string) => {
    const html = textToEscapedHtml(clip);
    setDraft({ text: clip, html });
    setEditorSeed(html);
    setEditorKey((k) => k + 1);
  }, []);

  const pasteFromSystem = useCallback(async () => {
    const clip = await readSystemClipboardText();
    if (!clip) return false;
    applyClipboardText(clip);
    return true;
  }, [applyClipboardText]);

  const openAndPaste = useCallback(async () => {
    const clip = await readSystemClipboardText();
    setOpen(true);
    if (clip) applyClipboardText(clip);
  }, [applyClipboardText, setOpen]);

  const addTextToBoard = useCallback(
    (text: string, html?: string, itemAssignee: ClipboardAssignee | null = null) => {
      const trimmed = text.trim();
      if (!trimmed) return false;

      const base = createClipboardPayload(trimmed, {
        html: html ?? textToEscapedHtml(trimmed),
        source: isHost ? "host" : "desktop",
        author: displayName,
        authorAvatar: getAvatarEmoji(avatarId),
        authorDeviceFingerprint: deviceFingerprint,
        assignee: itemAssignee,
      });

      const item: ClipboardBoardItem = {
        ...base,
        copiedToClipboard: false,
        assignee: itemAssignee,
      };

      onAdd(item);
      onBroadcast?.(item);
      return true;
    },
    [
      avatarId,
      deviceFingerprint,
      displayName,
      isHost,
      onAdd,
      onBroadcast,
      textToEscapedHtml,
    ]
  );

  const pasteQuickToBoard = useCallback(async () => {
    const clip = await readSystemClipboardText();
    if (!clip?.trim()) return false;
    const ok = addTextToBoard(clip, textToEscapedHtml(clip));
    if (ok) onQuickPaste?.();
    return ok;
  }, [addTextToBoard, onQuickPaste]);

  const resetEditor = () => {
    setDraft({ html: "", text: "" });
    setEditorSeed("");
    setEditorKey((k) => k + 1);
    setAssignee(null);
  };

  const handleAdd = () => {
    if (isEmptyEditorHtml(draft.html) && !draft.text.trim()) return;

    const text = draft.text.trim() || plainTextFromHtml(draft.html);
    if (!addTextToBoard(text, draft.html, assignee)) return;

    resetEditor();
    setOpen(false);
  };

  const canAdd = draft.text.trim().length > 0;

  return (
    <>
      {floatingFab && !open && (
        <PasteFab
          onClick={() => void openAndPaste()}
          onDoubleClick={() => void pasteQuickToBoard()}
        />
      )}

      {open && (
        <div
          className={cn(
            "fixed inset-x-3 bottom-[max(6.5rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-lg sm:static sm:inset-auto sm:z-auto sm:max-w-none",
            className
          )}
        >
          <div
            className={cn(
              "overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-lg backdrop-blur-sm",
              "sm:rounded-xl sm:shadow-md"
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/80 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                Paste to board
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={cn(
                  touchTarget,
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                )}
                aria-label="Close"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>

            <div
              id={panelId}
              className="compose-panel-in compose-panel-in-active flex flex-col gap-2.5 px-3 pb-3 pt-2.5 sm:gap-3 sm:px-3.5 sm:pb-3.5"
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
                Add to board
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
