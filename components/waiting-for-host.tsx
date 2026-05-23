"use client";

import { Loader2 } from "lucide-react";

import { OnariamLogo } from "@/components/onariam-logo";
import { Button } from "@/components/ui/button";
import { panel } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  topic: string;
  displayName: string;
  onLeave: () => void;
};

export function WaitingForHost({ topic, displayName, onLeave }: Props) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="shrink-0 border-b border-border pt-safe">
        <div className="flex items-center justify-center px-safe py-3">
          <OnariamLogo href={null} size="sm" />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col items-center justify-center gap-6 px-safe py-6 pb-safe">
        <div
          className={cn(
            panel,
            "flex w-full flex-col items-center gap-4 p-6 text-center sm:p-8"
          )}
        >
          <Loader2
            className="size-8 animate-spin text-primary"
            aria-hidden
          />
          <div className="min-w-0 w-full">
            <p className="truncate font-mono text-xs text-muted-foreground sm:text-sm">
              {topic}
            </p>
            <h1 className="mt-2 text-lg font-semibold text-foreground">
              Waiting for host
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {displayName}, the host needs to approve you before you can use
              the session.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full max-w-md touch-manipulation sm:w-auto sm:min-w-[8rem]"
          onClick={onLeave}
        >
          Leave
        </Button>
      </div>
    </div>
  );
}
