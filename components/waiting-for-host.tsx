"use client";

import { Loader2 } from "lucide-react";

import { OnariamLogo } from "@/components/onariam-logo";
import { Button } from "@/components/ui/button";
import { waitingHostCopy } from "@/lib/hook-copy";
import { formatMeetCode } from "@/lib/meet-code";
import { pageShell, panel, touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  topic: string;
  displayName: string;
  onLeave: () => void;
};

export function WaitingForHost({ topic, displayName, onLeave }: Props) {
  const code = formatMeetCode(topic);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="shrink-0 border-b border-border pt-safe">
        <div className={cn(pageShell, "flex justify-center py-3")}>
          <OnariamLogo href={null} size="sm" />
        </div>
      </header>
      <div
        className={cn(
          pageShell,
          "flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-8 pb-safe"
        )}
      >
        <div
          className={cn(panel, "w-full max-w-md space-y-3 p-6 text-center sm:p-8")}
          role="status"
          aria-live="polite"
        >
          <Loader2
            className="mx-auto size-8 animate-spin text-primary"
            aria-hidden
          />
          <div className="min-w-0 space-y-2">
            <p
              className="font-mono text-sm tracking-[0.1em] text-foreground"
              aria-label={`Session code ${code}`}
            >
              {code}
            </p>
            <h1 className="text-lg font-medium text-foreground">
              {waitingHostCopy.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {waitingHostCopy.body(displayName)}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className={cn(touchTarget, "h-11 w-full max-w-md sm:w-auto sm:min-w-[8rem]")}
          onClick={onLeave}
        >
          Leave session
        </Button>
      </div>
    </div>
  );
}
