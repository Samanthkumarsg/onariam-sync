"use client";

import { cn } from "@/lib/utils";

type Props = {
  message: string | null;
  className?: string;
  onDismiss?: () => void;
};

/** Top toast for host / session feedback (replaces non-actionable review banner). */
export function SessionToast({ message, className, onDismiss }: Props) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto fixed inset-x-3 top-[calc(3.75rem+env(safe-area-inset-top,0px))] z-[60] mx-auto flex max-w-lg items-center justify-center sm:inset-x-auto sm:left-1/2 sm:right-auto sm:-translate-x-1/2",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={onDismiss}
        className={cn(
          "w-full rounded-full border border-amber-500/35 bg-amber-500/12 px-4 py-2.5 text-center text-sm font-medium text-foreground",
          "shadow-sm backdrop-blur-sm transition-colors hover:bg-amber-500/18",
          "touch-manipulation"
        )}
      >
        {message}
      </button>
    </div>
  );
}
