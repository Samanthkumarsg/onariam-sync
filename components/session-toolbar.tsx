"use client";

import { LogOut, QrCode } from "lucide-react";

import { OnariamLogo } from "@/components/onariam-logo";
import { ParticipantsMenu } from "@/components/participants-menu";
import { SessionPairDrawer } from "@/components/session-pair-drawer";
import { SessionProfileMenu } from "@/components/session-profile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
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
  onHostToast?: (message: string) => void;
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
  onHostToast,
}: Props) {
  return (
    <>
      <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-card pt-safe">
        <div
          className={cn(
            pageShell,
            "flex min-h-12 min-w-0 items-center gap-2 py-2 sm:min-h-14"
          )}
        >
          <OnariamLogo size="sm" href="/" compact className="shrink-0" />

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => onPairOpenChange(true)}
              className={cn(
                touchTarget,
                "relative inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-elevated hover:text-foreground",
                phoneLinked && "text-foreground"
              )}
              aria-label={
                phoneLinked ? "Phone linked — show QR" : "Link phone — show QR"
              }
              aria-expanded={pairOpen}
            >
              <QrCode className="size-[1.125rem] shrink-0" aria-hidden />
              {phoneLinked && (
                <span
                  className="absolute right-1 top-1 size-1.5 rounded-full bg-action"
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
              onHostToast={onHostToast}
              triggerClassName={cn(touchTarget, "h-10 sm:h-9")}
            />

            <ThemeToggle />

            <SessionProfileMenu session={session} onLeave={onLeave} />
          </div>
        </div>
      </header>

      <SessionPairDrawer
        open={pairOpen}
        onOpenChange={onPairOpenChange}
        topic={session.topic}
        sendUrl={sendUrl}
        copiedSendLink={copiedSendLink}
        onCopySendLink={onCopySendLink}
        showSendUrl={showSendUrl}
        onToggleSendUrl={onToggleSendUrl}
      />
    </>
  );
}
