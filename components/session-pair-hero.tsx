"use client";

import { Link2, Lock } from "lucide-react";

import { QrDisplay } from "@/components/qr-display";
import { Button } from "@/components/ui/button";
import { emptyBoardCopy } from "@/lib/hook-copy";
import { touchTarget } from "@/lib/ui";
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
        "flex flex-col items-center gap-4 bg-transparent p-4 sm:gap-5 sm:p-6",
        className
      )}
      aria-labelledby="pair-phone-heading"
    >
      <div className="w-full max-w-sm space-y-1.5 text-center">
        <h2 id="pair-phone-heading" className="text-lg font-medium text-foreground">
          {emptyBoardCopy.linkPhoneTitle}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {emptyBoardCopy.linkPhoneBody}
        </p>
      </div>

      <QrDisplay
        url={sendUrl}
        size={220}
        className="w-full max-w-[min(100%,240px)] rounded-md"
      />

      <p className="flex max-w-sm items-center justify-center gap-1.5 text-center text-xs leading-relaxed text-muted-foreground">
        <Lock className="size-3.5 shrink-0 text-primary/70" aria-hidden />
        {emptyBoardCopy.privacyNote}
      </p>

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
        {showSendUrl && (
          <p className="break-all px-1 text-left font-mono text-xs leading-snug text-muted-foreground">
            {sendUrl}
          </p>
        )}
      </div>
    </section>
  );
}
