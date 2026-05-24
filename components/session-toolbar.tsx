"use client";

import { LogOut, QrCode } from "lucide-react";

import { OnariamLogo } from "@/components/onariam-logo";
import { ParticipantsMenu } from "@/components/participants-menu";
import { SessionPairDrawer } from "@/components/session-pair-drawer";
import type { RoomSession } from "@/lib/room-session";
import { pageShell, touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  session: RoomSession;
  phoneLinked: boolean;
  pairOpen: boolean;
  onPairOpenChange: (open: boolean) => void;
  sendUrl: string;
  copiedSendLink: boolean;
  onCopySendLink: () => void;
  showSendUrl: boolean;
  onToggleSendUrl: () => void;
  onLeave: () => void;
  participantsOpen?: boolean;
  onParticipantsOpenChange?: (open: boolean) => void;
};

export function SessionToolbar({
  session,
  phoneLinked,
  pairOpen,
  onPairOpenChange,
  sendUrl,
  copiedSendLink,
  onCopySendLink,
  showSendUrl,
  onToggleSendUrl,
  onLeave,
  participantsOpen,
  onParticipantsOpenChange,
}: Props) {
  return (
    <>
      <header className="sticky top-0 z-40 shrink-0 border-b border-border bg-background/95 pt-safe backdrop-blur-md supports-backdrop-filter:bg-background/90">
        <div
          className={cn(
            pageShell,
            "flex min-h-14 items-center justify-between gap-2 py-2"
          )}
        >
          <OnariamLogo size="sm" href="/" compact className="shrink-0" />

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => onPairOpenChange(true)}
              className={cn(
                touchTarget,
                "relative inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-surface-elevated hover:text-foreground",
                phoneLinked && "border-accent-foreground/35 text-accent-foreground"
              )}
              aria-label={
                phoneLinked ? "Phone linked — show QR" : "Link phone — show QR"
              }
              aria-expanded={pairOpen}
            >
              <QrCode className="size-4 shrink-0" aria-hidden />
              {phoneLinked && (
                <span
                  className="absolute right-1 top-1 size-1.5 rounded-full bg-accent-foreground"
                  aria-hidden
                />
              )}
            </button>

            <ParticipantsMenu
              topic={session.topic}
              deviceFingerprint={session.deviceFingerprint}
              currentDeviceFingerprint={session.deviceFingerprint}
              currentDeviceKind="desktop"
              isHost={session.isHost}
              open={participantsOpen}
              onOpenChange={onParticipantsOpenChange}
              triggerClassName={cn(touchTarget, "h-9")}
            />

            <button
              type="button"
              onClick={onLeave}
              className={cn(
                touchTarget,
                "inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:px-3"
              )}
              aria-label="Leave session"
            >
              <LogOut className="size-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>
        </div>
      </header>

      <SessionPairDrawer
        open={pairOpen}
        onOpenChange={onPairOpenChange}
        sendUrl={sendUrl}
        copiedSendLink={copiedSendLink}
        onCopySendLink={onCopySendLink}
        showSendUrl={showSendUrl}
        onToggleSendUrl={onToggleSendUrl}
      />
    </>
  );
}
