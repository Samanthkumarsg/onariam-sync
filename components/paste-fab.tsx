"use client";

import { ClipboardPaste } from "lucide-react";
import { useRef, type MouseEvent } from "react";

import { cn } from "@/lib/utils";

const CLICK_DELAY_MS = 280;

type Props = {
  /** Single tap — open compose editor */
  onClick: () => void;
  /** Double tap — paste from system clipboard straight to board */
  onDoubleClick?: () => void;
  className?: string;
  label?: string;
};

/** Floating paste control — curved ring + center tap target. */
export function PasteFab({
  onClick,
  onDoubleClick,
  className,
  label = "Paste",
}: Props) {
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    if (!onDoubleClick) {
      onClick();
      return;
    }
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      onClick();
    }, CLICK_DELAY_MS);
  };

  const handleDoubleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!onDoubleClick) return;
    e.preventDefault();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    onDoubleClick();
  };

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-30 sm:bottom-8 sm:right-8",
        className
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        onDoubleClick={onDoubleClick ? handleDoubleClick : undefined}
        className={cn(
          "pointer-events-auto relative flex size-[4.75rem] items-center justify-center rounded-full",
          "bg-primary text-primary-foreground shadow-md",
          "transition-transform motion-safe:active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "touch-manipulation"
        )}
        aria-label={
          onDoubleClick
            ? `${label}. Double-tap to paste to board without editing`
            : label
        }
      >
        <svg
          className="pointer-events-none absolute inset-0 size-full -rotate-90"
          viewBox="0 0 100 100"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="3 5"
            className="text-primary-foreground/35"
          />
          <defs>
            <path
              id="paste-fab-arc"
              d="M 50,50 m -34,0 a 34,34 0 1,1 68,0 a 34,34 0 1,1 -68,0"
            />
          </defs>
          <text
            fill="currentColor"
            className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/90"
          >
            <textPath href="#paste-fab-arc" startOffset="18%">
              {label}
            </textPath>
          </text>
        </svg>
        <ClipboardPaste className="relative z-[1] size-6 shrink-0" aria-hidden />
      </button>
    </div>
  );
}
