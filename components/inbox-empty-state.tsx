"use client";

import { Link2, Lock, Smartphone } from "lucide-react";

import { QrDisplay } from "@/components/qr-display";
import { Button } from "@/components/ui/button";
import { emptyInboxCopy } from "@/lib/hook-copy";
import { formatMeetCode } from "@/lib/meet-code";
import { panel, touchTarget } from "@/lib/ui";
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

export function InboxEmptyState({
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
        panel,
        "flex flex-col items-center gap-4 p-4 sm:gap-5 sm:p-6",
        className
      )}
      aria-labelledby="empty-inbox-heading"
    >
      <div className="w-full max-w-sm space-y-1 text-center">
        <h2
          id="empty-inbox-heading"
          className="text-base font-medium text-foreground sm:text-lg"
        >
          {phoneLinked ? emptyInboxCopy.readyTitle : emptyInboxCopy.linkPhoneTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {phoneLinked ? emptyInboxCopy.readyBody : emptyInboxCopy.linkPhoneBody}
        </p>
      </div>

      <p
        className="font-mono text-lg tracking-[0.12em] text-foreground"
        aria-label={`Session code ${code}`}
      >
        {code}
      </p>

      <div className="w-full max-w-[min(100%,240px)] rounded-lg border border-border bg-background p-3 sm:max-w-[260px] sm:p-4">
        <QrDisplay
          url={sendUrl}
          size={200}
          className="mx-auto w-full max-w-[200px] rounded-md sm:max-w-[220px]"
        />
      </div>

      {onCopySendLink && (
        <div className="flex w-full max-w-sm flex-col gap-2">
          <Button
            type="button"
            variant={phoneLinked ? "outline" : "default"}
            className={cn(touchTarget, "h-11 w-full gap-2")}
            onClick={onCopySendLink}
          >
            <Link2 className="size-4 shrink-0" aria-hidden />
            {copiedSendLink ? emptyInboxCopy.copyLinkDone : emptyInboxCopy.copyLinkCta}
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
            <p className="rounded-md border border-border bg-surface-elevated px-3 py-2.5 text-left font-mono text-xs leading-snug text-muted-foreground break-all">
              {sendUrl}
            </p>
          )}
        </div>
      )}

      {phoneLinked ? (
        <p className="flex max-w-sm items-center justify-center gap-1.5 text-center text-xs text-accent-foreground">
          <Smartphone className="size-3.5 shrink-0" aria-hidden />
          {emptyInboxCopy.phoneConnected}
        </p>
      ) : (
        <p className="flex max-w-sm items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Lock className="size-3.5 shrink-0" aria-hidden />
          {emptyInboxCopy.privacyNote}
        </p>
      )}
    </div>
  );
}
