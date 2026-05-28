"use client";

import { Link2, Lock, Smartphone } from "lucide-react";

import { QrDisplay } from "@/components/qr-display";
import { Button } from "@/components/ui/button";
import { emptyBoardCopy } from "@/lib/hook-copy";
import { formatMeetCode } from "@/lib/meet-code";
import { touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  phoneLinked?: boolean;
  topic: string;
  sendUrl: string;
  copiedSendLink?: boolean;
  onCopySendLink?: () => void;
  showSendUrl?: boolean;
  onToggleSendUrl?: () => void;
};

/** Empty session board — borderless; QR pairing when phone not linked. */
export function BoardEmptyState({
  className,
  phoneLinked,
  topic,
  sendUrl,
  copiedSendLink = false,
  onCopySendLink,
  showSendUrl = false,
  onToggleSendUrl,
}: Props) {
  const code = formatMeetCode(topic);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-1 py-4 pb-24 sm:gap-5 sm:py-6 sm:pb-8",
        className
      )}
      aria-labelledby="empty-board-heading"
    >
      <div className="w-full max-w-sm space-y-1.5 text-center">
        <h2
          id="empty-board-heading"
          className="text-base font-medium text-foreground sm:text-lg"
        >
          {phoneLinked ? emptyBoardCopy.readyTitle : emptyBoardCopy.linkPhoneTitle}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {phoneLinked ? emptyBoardCopy.readyBody : emptyBoardCopy.linkPhoneBody}
        </p>
      </div>

      {!phoneLinked && (
        <>
          <p
            className="font-mono text-lg tracking-[0.12em] text-foreground"
            aria-label={`Session code ${code}`}
          >
            {code}
          </p>

          <QrDisplay
            url={sendUrl}
            size={200}
            className="w-full max-w-[min(100%,220px)] rounded-md"
          />

          {onCopySendLink && (
            <div className="flex w-full max-w-sm flex-col gap-2">
              <Button
                type="button"
                variant="default"
                className={cn(touchTarget, "h-11 w-full gap-2")}
                onClick={onCopySendLink}
              >
                <Link2 className="size-4 shrink-0" aria-hidden />
                {copiedSendLink ? emptyBoardCopy.copyLinkDone : emptyBoardCopy.copyLinkCta}
              </Button>
              {onToggleSendUrl && (
                <button
                  type="button"
                  onClick={onToggleSendUrl}
                  className={cn(
                    touchTarget,
                    "text-sm font-medium text-action underline-offset-2 hover:underline"
                  )}
                >
                  {showSendUrl ? "Hide link" : "Show link"}
                </button>
              )}
              {showSendUrl && (
                <p className="break-all px-1 text-left font-mono text-xs leading-snug text-muted-foreground">
                  {sendUrl}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {phoneLinked ? (
        <p className="flex max-w-sm items-center justify-center gap-1.5 text-center text-xs text-accent-foreground">
          <Smartphone className="size-3.5 shrink-0" aria-hidden />
          {emptyBoardCopy.phoneConnected}
        </p>
      ) : (
        <p className="flex max-w-sm items-center justify-center gap-1.5 text-center text-xs leading-relaxed text-muted-foreground">
          <Lock className="size-3.5 shrink-0 text-primary/70" aria-hidden />
          {emptyBoardCopy.privacyNote}
        </p>
      )}
    </div>
  );
}
