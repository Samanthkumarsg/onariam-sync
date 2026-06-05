"use client";

import { useCallback, useState } from "react";

import { ComposePanelBody } from "@/components/compose-panel-body";
import { ComposeSheet } from "@/components/compose-sheet";
import { PasteFab } from "@/components/paste-fab";
import {
  type ClipboardEditorValue,
} from "@/components/clipboard-editor";
import {
  isEmptyEditorHtml,
  plainTextFromHtml,
  textToEscapedHtml,
} from "@/lib/clipboard-html";
import { readSystemClipboardText } from "@/lib/clipboard-read";
import type { AvatarId } from "@/lib/avatars";
import { getAvatarEmoji } from "@/lib/avatars";
import type { ClipboardAssignee } from "@/lib/clipboard-assignee";
import {
  createClipboardFilePayload,
  createClipboardPayload,
} from "@/lib/clipboard-p2p";
import type { IpfsFileMeta } from "@/lib/ipfs";
import type { ClipboardBoardItem } from "@/lib/clipboard-inbox-storage";
import type { RoomMember } from "@/lib/meetings";

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
  floatingFab?: boolean;
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
  floatingFab = true,
  onQuickPaste,
}: Props) {
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
  const [fileError, setFileError] = useState<string | null>(null);

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
    ]
  );

  const addFileToBoard = useCallback(
    (file: IpfsFileMeta, itemAssignee: ClipboardAssignee | null = null) => {
      const base = createClipboardFilePayload(file, {
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
    ]
  );

  const resetEditor = useCallback(() => {
    setDraft({ html: "", text: "" });
    setEditorSeed("");
    setEditorKey((k) => k + 1);
    setAssignee(null);
  }, []);

  const handleFileReady = useCallback(
    (file: IpfsFileMeta) => {
      setFileError(null);
      addFileToBoard(file, assignee);
      onQuickPaste?.();
      resetEditor();
      setOpen(false);
    },
    [addFileToBoard, assignee, onQuickPaste, resetEditor, setOpen]
  );

  const pasteQuickToBoard = useCallback(async () => {
    const clip = await readSystemClipboardText();
    if (!clip?.trim()) return false;
    const ok = addTextToBoard(clip, textToEscapedHtml(clip));
    if (ok) onQuickPaste?.();
    return ok;
  }, [addTextToBoard, onQuickPaste]);

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

      <ComposeSheet
        open={open}
        onOpenChange={setOpen}
        title="Paste to board"
        description="Paste text or attach a file — it appears on the board for everyone."
      >
        <ComposePanelBody
          editorKey={editorKey}
          editorSeed={editorSeed}
          draft={draft}
          onChange={setDraft}
          onPasteFromClipboard={() => void pasteFromSystem()}
          fileError={fileError}
          onFileReady={handleFileReady}
          onFileError={setFileError}
          showAssignee={showAssignee}
          members={members}
          deviceFingerprint={deviceFingerprint}
          assignee={assignee}
          onAssigneeChange={setAssignee}
          canSubmit={canAdd}
          submitLabel="Add to board"
          submitIcon="plus"
          onSubmit={handleAdd}
        />
      </ComposeSheet>
    </>
  );
}
