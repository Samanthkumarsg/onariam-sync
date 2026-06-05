import { cn } from "@/lib/utils";

/** Cohere / Cursor-web design primitives — see DESIGN.md */

export const eyebrow =
  "font-mono text-xs font-normal uppercase tracking-[0.28px] text-muted-foreground";

export const headline =
  "font-[family-name:var(--font-display)] text-2xl font-normal leading-tight tracking-[-0.02em] text-foreground sm:text-[28px] md:text-[32px]";

export const subhead = "text-sm leading-relaxed text-ink-muted";

export const label = "text-sm text-muted-foreground";

/** White card on gray canvas (Cursor settings / composer panels) */
export const panel = cn(
  "rounded-xl border border-border bg-card",
  "p-4 sm:p-5",
  "shadow-none"
);

export const paperCard = "paper-card rounded-xl";

export const popover = cn(
  "rounded-xl border border-border bg-popover shadow-none"
);

export const input = cn(
  "h-11 w-full min-w-0 rounded-lg border border-border bg-input px-3.5 text-base text-foreground sm:h-10 sm:text-sm",
  "placeholder:text-muted-foreground",
  "transition-colors outline-none",
  "focus:border-ring focus:ring-2 focus:ring-ring/25"
);

export const btnGhost = cn(
  "rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground",
  "transition-colors hover:bg-surface-elevated hover:text-foreground"
);

/** Header / toolbar icon control — light fill, subtle border */
export const toolbarControl = cn(
  "inline-flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground",
  "transition-colors hover:bg-surface-elevated hover:text-foreground"
);

export const chip = cn(
  "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1",
  "font-mono text-[13px] text-foreground"
);

export const divider = "h-px flex-1 bg-border";

/** Shared page width — toolbar and main content stay aligned */
export const pageShell =
  "mx-auto w-full min-w-0 max-w-3xl px-safe sm:px-6";

/** Vertical rhythm for session / form pages */
export const stackLayout = "flex min-h-0 flex-1 flex-col gap-3 sm:gap-4";

/** Session board column: actions, optional footer, scrollable list */
export const sessionBoardLayout =
  "flex min-h-0 min-w-0 flex-1 flex-col gap-3 sm:gap-4";

/** @deprecated Use sessionBoardLayout */
export const sessionInboxLayout = sessionBoardLayout;

/** Minimum touch target (Fitts's law, WCAG 2.5.5) */
export const touchTarget =
  "min-h-11 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
