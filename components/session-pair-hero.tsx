"use client";

import { Lock, Link2 } from "lucide-react";

import { QrDisplay } from "@/components/qr-display";
import { Button } from "@/components/ui/button";
import { panel, touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  sendUrl: string;
  copiedSendLink: boolean;
  onCopySendLink: () => void;
  showSendUrl: boolean;
  onToggleSendUrl: () => void;
  className?: string;
};

export function SessionPairHero({
  sendUrl,
  copiedSendLink,
  onCopySendLink,
  showSendUrl,
  onToggleSendUrl,
  className,
}: Props) {
  return (
    <section
      className={cn(
        panel,
        "flex flex-col items-center gap-4 p-4 sm:gap-5 sm:p-6",
        className
      )}
      aria-labelledby="pair-phone-heading"
    >
      <div className="w-full max-w-sm space-y-1 text-center">
        <h2 id="pair-phone-heading" className="text-lg font-medium text-foreground">
          Link your phone
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Scan to open the send page, then paste on your phone. Text arrives here
          over a direct connection.
        </p>
      </div>

      <div className="w-full max-w-[min(100%,280px)] rounded-lg border border-border bg-background p-4">
        <QrDisplay
          url={sendUrl}
          size={220}
          className="mx-auto w-full max-w-[220px] rounded-md"
        />
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Lock className="size-3.5 shrink-0" aria-hidden />
        Direct to this browser. Not stored on our servers.
      </p>

      <div className="flex w-full max-w-sm flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          className={cn(touchTarget, "h-11 w-full gap-2")}
          onClick={onCopySendLink}
        >
          <Link2 className="size-4 shrink-0" aria-hidden />
          {copiedSendLink ? "Send link copied" : "Copy link for phone"}
        </Button>
        <button
          type="button"
          onClick={onToggleSendUrl}
          className={cn(
            touchTarget,
            "text-sm font-medium text-action underline-offset-2 hover:underline"
          )}
        >
          {showSendUrl ? "Hide send link" : "Show send link"}
        </button>
        {showSendUrl && (
          <p className="rounded-md border border-border bg-surface-elevated px-3 py-2.5 font-mono text-xs leading-snug text-muted-foreground break-all">
            {sendUrl}
          </p>
        )}
      </div>
    </section>
  );
}
