"use client";

import { Plus, Send } from "lucide-react";

import {
  ClipboardEditor,
  type ClipboardEditorValue,
} from "@/components/clipboard-editor";
import { FileAttachButton } from "@/components/file-attach-button";
import { MemberTagPicker } from "@/components/member-tag-picker";
import { Button } from "@/components/ui/button";
import type { ClipboardAssignee } from "@/lib/clipboard-assignee";
import type { RoomMember } from "@/lib/meetings";
import { touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  editorKey: number;
  editorSeed: string;
  draft: ClipboardEditorValue;
  onChange: (value: ClipboardEditorValue) => void;
  onPasteFromClipboard: () => void;
  placeholder?: string;
  fileError: string | null;
  onFileReady: (file: import("@/lib/ipfs").IpfsFileMeta) => void;
  onFileError: (message: string) => void;
  fileAttachDisabled?: boolean;
  showAssignee?: boolean;
  members: RoomMember[];
  deviceFingerprint: string;
  assignee: ClipboardAssignee | null;
  onAssigneeChange: (assignee: ClipboardAssignee | null) => void;
  canSubmit: boolean;
  submitLabel: string;
  submitIcon?: "plus" | "send";
  onSubmit: () => void;
  className?: string;
};

export function ComposePanelBody({
  editorKey,
  editorSeed,
  draft,
  onChange,
  onPasteFromClipboard,
  placeholder = "Paste or compose…",
  fileError,
  onFileReady,
  onFileError,
  fileAttachDisabled = false,
  showAssignee = true,
  members,
  deviceFingerprint,
  assignee,
  onAssigneeChange,
  canSubmit,
  submitLabel,
  submitIcon = "plus",
  onSubmit,
  className,
}: Props) {
  const SubmitIcon = submitIcon === "send" ? Send : Plus;

  return (
    <div
      className={cn(
        "compose-panel-in compose-panel-in-active flex flex-col gap-2.5 py-3 sm:gap-3",
        className
      )}
    >
      <ClipboardEditor
        key={editorKey}
        initialContent={editorSeed}
        placeholder={placeholder}
        minHeightClassName="min-h-[5.5rem] sm:min-h-[6.5rem]"
        onChange={onChange}
        onPasteFromClipboard={onPasteFromClipboard}
      />

      <div className="flex flex-wrap items-center gap-2">
        <FileAttachButton
          onFileReady={onFileReady}
          onError={onFileError}
          disabled={fileAttachDisabled}
        />
        {fileError ? (
          <p className="text-xs text-destructive">{fileError}</p>
        ) : null}
      </div>

      {showAssignee && (
        <MemberTagPicker
          members={members}
          currentDeviceFingerprint={deviceFingerprint}
          value={assignee}
          onChange={onAssigneeChange}
          className="space-y-1.5 [&_button]:min-h-7"
        />
      )}

      <Button
        type="button"
        size="sm"
        className={cn(touchTarget, "h-11 w-full sm:h-9 sm:w-auto sm:self-end")}
        disabled={!canSubmit}
        onClick={onSubmit}
      >
        <SubmitIcon className="size-3.5 shrink-0" aria-hidden />
        {submitLabel}
      </Button>
    </div>
  );
}
