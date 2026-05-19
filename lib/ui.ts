import { cn } from "@/lib/utils";

/** Linear design primitives — see DESIGN.md */

export const eyebrow = "text-[13px] font-medium uppercase tracking-[0.04em] text-muted-foreground";

export const headline = "text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground";

export const subhead = "text-sm leading-normal text-ink-muted";

export const label = "text-sm text-muted-foreground";

export const panel = cn(
  "rounded-lg border border-border bg-card p-6",
  "shadow-none ring-1 ring-inset ring-white/[0.04]"
);

export const input = cn(
  "h-9 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "transition-colors outline-none",
  "focus:border-primary focus:ring-2 focus:ring-primary/30"
);

export const btnGhost = cn(
  "rounded-md px-2 py-1 text-xs font-medium text-muted-foreground",
  "transition-colors hover:bg-surface-elevated hover:text-foreground"
);

export const chip = cn(
  "inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1",
  "font-mono text-[13px] text-foreground"
);

export const divider = "h-px flex-1 bg-border";
