"use client";

import { Loader2 } from "lucide-react";

import { OnariamLogo } from "@/components/onariam-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { pageShell, panel, touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  topic: string;
  displayName: string;
  onLeave: () => void;
};

export function WaitingForHost({ topic, displayName, onLeave }: Props) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-card pt-safe">
        <div
          className={cn(
            pageShell,
            "relative flex min-h-12 items-center justify-center py-3"
          )}
        >
          <OnariamLogo href={null} size="sm" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div
        className={cn(
          pageShell,
          "flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-8 pb-safe"
        )}
      >
        <div
          className={cn(panel, "w-full max-w-md space-y-4 p-6 text-center sm:p-8")}
          role="status"
          aria-live="polite"
        >
          <Loader2
            className="mx-auto size-8 animate-spin text-primary"
            aria-hidden
          />
          <div className="min-w-0 space-y-2">
            <p className="font-mono text-xs text-muted-foreground">{topic}</p>
            <h1 className="text-lg font-medium text-foreground">
              Waiting for host approval
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Hi {displayName} — the host will let you in shortly. This page
              updates automatically.
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
