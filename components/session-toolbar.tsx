"use client";

import { Check, Link2, LogOut, QrCode, Wifi, WifiOff } from "lucide-react";

import { OnariamLogo } from "@/components/onariam-logo";
import { ParticipantsMenu } from "@/components/participants-menu";
import { QrDisplay } from "@/components/qr-display";
import { Button } from "@/components/ui/button";
import { useClipboardP2p } from "@/hooks/use-clipboard-p2p";
import type { RoomSession } from "@/lib/room-session";
import { cn } from "@/lib/utils";

type Props = {
  session: RoomSession;
  sendUrl: string;
  p2pStatus: ReturnType<typeof useClipboardP2p>["status"];
  p2pError: string | null;
  showQr: boolean;
  onToggleQr: () => void;
  copiedInvite: boolean;
  onCopyInvite: () => void;
  copiedSendLink: boolean;
  onCopySendLink: () => void;
  showSendUrl: boolean;
  onToggleSendUrl: () => void;
  onLeave: () => void;
};

function ToolbarDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-5 w-px shrink-0 bg-border", className)}
      role="separator"
      aria-orientation="vertical"
    />
  );
}

function statusLabel(status: ReturnType<typeof useClipboardP2p>["status"]) {
  switch (status) {
    case "waiting":
      return "Waiting for phone";
    case "connecting":
      return "Connecting…";
    case "connected":
      return "Ready to receive";
    case "failed":
      return "Connection failed";
    default:
      return "Starting…";
  }
}

function ConnectionBadge({
  status,
  error,
}: {
  status: ReturnType<typeof useClipboardP2p>["status"];
  error: string | null;
}) {
  const connected = status === "connected";
  const failed = status === "failed";

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
        connected &&
          "border-emerald-500/35 bg-emerald-500/10 text-emerald-400",
        failed && "border-destructive/35 bg-destructive/10 text-destructive",
        !connected &&
          !failed &&
          "border-border bg-surface-elevated text-muted-foreground"
      )}
      role="status"
      aria-live="polite"
    >
      {connected ? (
        <Wifi className="size-3.5 shrink-0" aria-hidden />
      ) : failed ? (
        <WifiOff className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <span
          className="size-2 shrink-0 animate-pulse rounded-full bg-primary"
          aria-hidden
        />
      )}
      <span className="truncate">{error ?? statusLabel(status)}</span>
    </div>
  );
}

function HeaderActions({
  session,
  onLeave,
  className,
}: {
  session: RoomSession;
  onLeave: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5 sm:gap-2", className)}>
      <ParticipantsMenu
        topic={session.topic}
        deviceFingerprint={session.deviceFingerprint}
        currentDeviceFingerprint={session.deviceFingerprint}
        isHost={session.isHost}
        triggerClassName="h-10 min-h-10 w-10 min-w-10 justify-center px-0 sm:h-9 sm:min-h-9 sm:min-w-0 sm:w-auto sm:px-2.5"
      />
      <ToolbarDivider className="hidden sm:block" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onLeave}
        className={cn(
          "h-10 min-h-10 min-w-10 shrink-0 px-0 sm:h-9 sm:min-h-9 sm:min-w-0 sm:gap-1.5 sm:px-2.5",
          "border-border text-muted-foreground",
          "hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
        )}
        aria-label="Leave session"
      >
        <LogOut className="size-4 shrink-0" aria-hidden />
        <span className="hidden md:inline">Leave</span>
      </Button>
    </div>
  );
}

export function SessionToolbar({
  session,
  sendUrl,
  p2pStatus,
  p2pError,
  showQr,
  onToggleQr,
  copiedInvite,
  onCopyInvite,
  copiedSendLink,
  onCopySendLink,
  showSendUrl,
  onToggleSendUrl,
  onLeave,
}: Props) {
  const connected = p2pStatus === "connected";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 pt-safe backdrop-blur-md supports-backdrop-filter:bg-background/80">
      <div className="mx-auto max-w-6xl px-safe">
        {/* Mobile: two rows. Desktop: single 3-column row */}
        <div className="flex flex-col gap-2 py-2 sm:grid sm:h-14 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-3 sm:py-0">
          <div className="flex items-center justify-between gap-2 sm:contents">
            <OnariamLogo size="sm" href="/" compact className="shrink-0" />
            <HeaderActions
              session={session}
              onLeave={onLeave}
              className="sm:hidden"
            />
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <div
              className={cn(
                "flex h-10 min-h-10 min-w-0 flex-1 items-stretch overflow-hidden rounded-lg border border-border sm:h-9 sm:min-h-9",
                "bg-card/80 shadow-none ring-1 ring-inset ring-white/[0.04]"
              )}
              role="group"
              aria-label="Session code"
            >
              <span className="hidden shrink-0 items-center border-r border-border bg-surface-elevated/80 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:flex">
                Session
              </span>
              <code
                className="flex min-w-0 flex-1 items-center truncate px-2 font-mono text-xs text-foreground sm:px-2.5 sm:text-[13px]"
                title={session.topic}
              >
                {session.topic}
              </code>
              <button
                type="button"
                onClick={onCopyInvite}
                className={cn(
                  "inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center border-l border-border sm:min-h-9 sm:min-w-0 sm:gap-1.5 sm:px-2.5",
                  "text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
                  "touch-manipulation",
                  copiedInvite && "bg-primary/10 text-primary"
                )}
                aria-label={copiedInvite ? "Invite link copied" : "Copy invite link"}
              >
                {copiedInvite ? (
                  <Check className="size-4 shrink-0" aria-hidden />
                ) : (
                  <Link2 className="size-4 shrink-0" aria-hidden />
                )}
                <span className="hidden md:inline">
                  {copiedInvite ? "Copied" : "Invite"}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={onToggleQr}
              aria-expanded={showQr}
              aria-controls="session-qr-panel"
              className={cn(
                "inline-flex h-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg border sm:h-9 sm:min-h-9 sm:min-w-0 sm:gap-1.5 sm:px-2.5",
                "touch-manipulation text-xs font-medium transition-colors",
                "ring-1 ring-inset ring-white/[0.04]",
                showQr
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card/80 text-muted-foreground hover:bg-surface-elevated hover:text-foreground",
                !connected && !showQr && "border-amber-500/40 text-amber-500"
              )}
              aria-label={showQr ? "Hide QR code" : "Show QR code"}
            >
              <QrCode className="size-4 shrink-0" aria-hidden />
              <span className="hidden lg:inline">
                {showQr ? "Hide QR" : "Show QR"}
              </span>
            </button>
          </div>

          <HeaderActions
            session={session}
            onLeave={onLeave}
            className="hidden justify-end sm:flex"
          />
        </div>
      </div>

      {showQr && (
        <div
          id="session-qr-panel"
          className="border-t border-border bg-card/40"
          role="region"
          aria-label="Pair your phone"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-safe py-4 sm:flex-row sm:items-center sm:gap-6 sm:py-5">
            <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:items-start">
              <div className="rounded-xl border border-border bg-background p-3 shadow-inner ring-1 ring-inset ring-white/[0.03] sm:p-2.5">
                <QrDisplay
                  url={sendUrl}
                  size={168}
                  className="mx-auto rounded-md sm:hidden"
                />
                <QrDisplay
                  url={sendUrl}
                  size={128}
                  className="hidden rounded-md sm:block"
                />
              </div>
              <ConnectionBadge status={p2pStatus} error={p2pError} />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="text-center sm:text-left">
                <p className="text-sm font-medium text-foreground">
                  Scan to send from your phone
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Open your camera, scan the code, then paste or type on the
                  send page. Peer-to-peer — not stored on our servers.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-11 w-full gap-2 touch-manipulation sm:h-9 sm:w-auto"
                  onClick={onCopySendLink}
                >
                  <Link2 className="size-4" aria-hidden />
                  {copiedSendLink ? "Send link copied" : "Copy send link"}
                </Button>
                <button
                  type="button"
                  onClick={onToggleSendUrl}
                  className="min-h-11 text-center text-xs font-medium text-muted-foreground underline-offset-2 touch-manipulation hover:text-foreground hover:underline sm:min-h-0 sm:text-left"
                >
                  {showSendUrl ? "Hide link" : "Show link"}
                </button>
              </div>
              {showSendUrl && (
                <p className="rounded-md border border-border bg-surface-elevated/80 px-2.5 py-2 text-center font-mono text-[10px] leading-snug text-muted-foreground break-all sm:text-left">
                  {sendUrl}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
