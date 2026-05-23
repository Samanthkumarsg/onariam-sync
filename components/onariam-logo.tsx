import Link from "next/link";

import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Header toolbar vs marketing hero */
  size?: "sm" | "md";
  /** Link to home (default true) */
  href?: string | null;
  /** Mark only — for dense toolbars */
  compact?: boolean;
};

export function OnariamLogo({
  className,
  size = "md",
  href = "/",
  compact = false,
}: Props) {
  const mark = (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md bg-primary/15 font-semibold text-primary ring-1 ring-primary/25",
        size === "sm" ? "size-7 text-xs" : "size-8 text-sm"
      )}
      aria-hidden
    >
      O
    </span>
  );

  const wordmark = (
    <span className="flex min-w-0 flex-col leading-none">
      <span
        className={cn(
          "font-semibold tracking-[-0.02em] text-foreground",
          size === "sm" ? "text-sm" : "text-base"
        )}
      >
        Onariam
        <span className="text-primary"> Sync</span>
      </span>
      {size === "md" && (
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Clipboard sync
        </span>
      )}
    </span>
  );

  const content = (
    <>
      {mark}
      {!compact && wordmark}
    </>
  );

  const rootClass = cn(
    "flex items-center gap-2.5 transition-opacity hover:opacity-90",
    className
  );

  const ariaLabel = compact ? "Onariam Sync home" : undefined;

  if (href) {
    return (
      <Link
        href={href}
        className={rootClass}
        aria-label={ariaLabel ?? "Onariam Sync home"}
      >
        {content}
      </Link>
    );
  }

  return <div className={rootClass}>{content}</div>;
}
