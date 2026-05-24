"use client";

import { Clipboard } from "lucide-react";

import { panel } from "@/lib/ui";
import { cn } from "@/lib/utils";

const steps = [
  {
    step: "1",
    title: "Link your phone",
    body: "Tap the QR icon in the header to open the send page on your phone.",
  },
  {
    step: "2",
    title: "Send from mobile",
    body: "Paste or type there — items appear in this shared inbox for everyone in the session.",
  },
  {
    step: "3",
    title: "Add from this computer",
    body: "Use Add to inbox below to paste from your desktop clipboard.",
  },
] as const;

type Props = {
  className?: string;
  phoneLinked?: boolean;
};

export function InboxEmptyState({ className, phoneLinked }: Props) {
  const stepsToShow = phoneLinked
    ? steps.filter((s) => s.step !== "1")
    : steps;

  return (
    <div className={cn(panel, "flex flex-col gap-5 sm:gap-6", className)}>
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-elevated"
          aria-hidden
        >
          <Clipboard className="size-6 text-muted-foreground" />
        </div>
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-medium text-foreground sm:text-lg">
            Your inbox is empty
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Shared with everyone approved in this session. Send from your phone
            or add from this browser.
          </p>
        </div>
      </div>

      <ol className="grid gap-2 sm:gap-3" aria-label="How to get started">
        {stepsToShow.map((item, index) => (
          <li
            key={item.step}
            className="flex min-w-0 gap-3 rounded-md border border-border/80 bg-background p-3 sm:p-3.5"
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs text-muted-foreground"
              aria-hidden
            >
              {phoneLinked ? index + 1 : item.step}
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
