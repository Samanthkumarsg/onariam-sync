"use client";

import { Download, Eraser, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { panel } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  itemCount: number;
  onSave: () => void;
  onErase: () => void;
  onCancel: () => void;
};

export function LeaveSessionDialog({
  open,
  itemCount,
  onSave,
  onErase,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-dialog-title"
    >
      <div
        className={cn(
          panel,
          "w-full max-w-md rounded-b-none p-6 pb-safe shadow-xl sm:rounded-lg"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="leave-dialog-title"
              className="text-lg font-semibold text-foreground"
            >
              Leave session?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {itemCount > 0
                ? `You have ${itemCount} clipboard item${itemCount === 1 ? "" : "s"} in this session. Save them before leaving, or erase and exit.`
                : "Clipboard items from this session are only stored on this device."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {itemCount > 0 && (
            <Button
              type="button"
              className="h-11 flex-1 touch-manipulation sm:h-10"
              onClick={onSave}
            >
              <Download className="size-4" aria-hidden />
              Save as .txt
            </Button>
          )}
          <Button
            type="button"
            variant={itemCount > 0 ? "outline" : "default"}
            className="h-11 flex-1 touch-manipulation sm:h-10"
            onClick={onErase}
          >
            <Eraser className="size-4" aria-hidden />
            {itemCount > 0 ? "Erase & leave" : "Leave"}
          </Button>
        </div>
      </div>
    </div>
  );
}
