"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  ClipboardPaste,
  Italic,
  List,
  Redo2,
  Undo2,
} from "lucide-react";
import { useEffect } from "react";

import { plainTextFromHtml } from "@/lib/clipboard-html";
import { cn } from "@/lib/utils";

export type ClipboardEditorValue = {
  html: string;
  text: string;
};

type Props = {
  placeholder?: string;
  className?: string;
  minHeightClassName?: string;
  initialContent?: string;
  onChange: (value: ClipboardEditorValue) => void;
  onPasteFromClipboard?: () => void;
  disabled?: boolean;
};

function ToolbarButton({
  onClick,
  active,
  label,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors",
        "hover:bg-surface-elevated hover:text-foreground disabled:opacity-40",
        active && "border-border bg-surface-elevated text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function ClipboardEditor({
  placeholder = "Paste or type…",
  className,
  minHeightClassName = "min-h-[120px]",
  initialContent = "",
  onChange,
  onPasteFromClipboard,
  disabled = false,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
    ],
    content: initialContent,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "tiptap-editor focus:outline-none",
          minHeightClassName,
          "px-3 py-2.5 text-sm leading-relaxed text-foreground"
        ),
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onChange({ html, text: plainTextFromHtml(html) });
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-input",
          minHeightClassName,
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-input ring-1 ring-inset ring-white/[0.03]",
        "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25",
        disabled && "opacity-60",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-card/60 px-1.5 py-1">
        <ToolbarButton
          label="Bold"
          disabled={disabled}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          disabled={disabled}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          disabled={disabled}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
        <ToolbarButton
          label="Undo"
          disabled={disabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={disabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="size-3.5" />
        </ToolbarButton>
        {onPasteFromClipboard && (
          <>
            <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
            <ToolbarButton
              label="Paste from system clipboard"
              disabled={disabled}
              onClick={onPasteFromClipboard}
            >
              <ClipboardPaste className="size-3.5" />
            </ToolbarButton>
          </>
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export function clearClipboardEditor(editor: ReturnType<typeof useEditor>) {
  editor?.commands.clearContent();
}
