"use client";

import { X } from "lucide-react";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

function ComposeModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 supports-backdrop-filter:backdrop-blur-xs"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <div className="absolute inset-0 flex items-end justify-center p-4 sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="compose-sheet-title"
          className={cn(
            "relative flex w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-lg",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0 space-y-0.5">
              <h2
                id="compose-sheet-title"
                className="text-sm font-semibold text-foreground"
              >
                {title}
              </h2>
              {description ? (
                <p className="text-xs text-muted-foreground">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={cn(
                touchTarget,
                "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
              )}
              aria-label="Close"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Mobile: bottom drawer. Desktop: centered modal. */
export function ComposeSheet(props: Props) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={props.open} onOpenChange={props.onOpenChange}>
        <DrawerContent
          className={cn(
            "max-h-[min(92dvh,720px)] border-border/60 bg-card pb-safe",
            props.className
          )}
        >
          <DrawerHeader className="border-b border-border pb-3 text-left">
            <DrawerTitle>{props.title}</DrawerTitle>
            {props.description ? (
              <DrawerDescription>{props.description}</DrawerDescription>
            ) : null}
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
            {props.children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return <ComposeModal {...props} />;
}
