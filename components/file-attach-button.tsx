"use client";

import { Loader2, Paperclip } from "lucide-react";
import { useId, useRef, useState } from "react";

import { formatFileSize, uploadFileToIpfs, type IpfsFileMeta } from "@/lib/ipfs";
import { touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  onFileReady: (file: IpfsFileMeta) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
};

export function FileAttachButton({
  onFileReady,
  onError,
  disabled = false,
  className,
  label = "Attach file",
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadName(file.name);
    try {
      const meta = await uploadFileToIpfs(file);
      onFileReady(meta);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadName(null);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => void handleChange(e)}
      />
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          touchTarget,
          "inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors",
          "hover:bg-surface-elevated hover:text-foreground disabled:opacity-50",
          className
        )}
        aria-label={label}
      >
        {uploading ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
        ) : (
          <Paperclip className="size-3.5 shrink-0" aria-hidden />
        )}
        <span className="truncate">
          {uploading && uploadName
            ? `Uploading ${uploadName}…`
            : label}
        </span>
        {!uploading && (
          <span className="hidden text-[10px] text-muted-foreground sm:inline">
            · IPFS · max {formatFileSize(32 * 1024 * 1024)}
          </span>
        )}
      </button>
    </>
  );
}
