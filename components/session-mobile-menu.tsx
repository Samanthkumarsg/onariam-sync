"use client";

import {
  Check,
  ClipboardPaste,
  Link2,
  LogOut,
  MoreHorizontal,
  QrCode,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  phoneLinked: boolean;
  pendingCount?: number;
  onAdd: () => void;
  onPair: () => void;
  onParticipants: () => void;
  onSummarize: () => void;
  onLeave: () => void;
  copiedInvite: boolean;
  onCopyInvite: () => void;
  copiedSendLink: boolean;
  onCopySendLink: () => void;
  showSendUrl: boolean;
  onToggleSendUrl: () => void;
};

function DockButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        touchTarget,
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium leading-tight",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
      )}
      aria-label={label}
    >
      {children}
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}

function SheetRow({
  onClick,
  children,
  destructive,
}: {
  onClick: () => void;
  children: ReactNode;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        touchTarget,
        "flex w-full items-center gap-2.5 rounded-md px-3 py-3 text-left text-sm",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-surface-elevated"
      )}
    >
      {children}
    </button>
  );
}

export function SessionMobileMenu({
  phoneLinked,
  pendingCount = 0,
  onAdd,
  onPair,
  onParticipants,
  onSummarize,
  onLeave,
  copiedInvite,
  onCopyInvite,
  copiedSendLink,
  onCopySendLink,
  showSendUrl,
  onToggleSendUrl,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 pb-safe shadow-[0_-4px_24px_rgba(23,23,28,0.08)] backdrop-blur-md supports-backdrop-filter:bg-card/90 sm:hidden"
        aria-label="Session actions"
      >
        <div className="mx-auto flex max-w-lg items-stretch gap-0.5 px-1 pt-1">
          <DockButton label="Add to inbox" onClick={onAdd}>
            <ClipboardPaste className="size-5 shrink-0" aria-hidden />
          </DockButton>
          <DockButton label="Link phone" onClick={onPair} active={phoneLinked}>
            <span className="relative">
              <QrCode className="size-5 shrink-0" aria-hidden />
              {phoneLinked && (
                <span
                  className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-accent-foreground ring-2 ring-card"
                  aria-hidden
                />
              )}
            </span>
          </DockButton>
          <DockButton label="People" onClick={onParticipants}>
            <span className="relative">
              <Users className="size-5 shrink-0" aria-hidden />
              {pendingCount > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white"
                  aria-hidden
                >
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </span>
          </DockButton>
          <DockButton label="Summarize" onClick={onSummarize}>
            <Sparkles className="size-5 shrink-0" aria-hidden />
          </DockButton>
          <DockButton label="More" onClick={() => setMoreOpen(true)}>
            <MoreHorizontal className="size-5 shrink-0" aria-hidden />
          </DockButton>
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="sm:hidden">
          <DrawerHeader className="text-left">
            <DrawerTitle>More</DrawerTitle>
            <DrawerDescription>Session links and settings</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-0.5 px-2 pb-6">
            <SheetRow
              onClick={() => {
                onCopyInvite();
              }}
            >
              {copiedInvite ? (
                <Check className="size-4 shrink-0 text-primary" aria-hidden />
              ) : (
                <Users className="size-4 shrink-0" aria-hidden />
              )}
              {copiedInvite ? "Invite copied" : "Copy session invite"}
            </SheetRow>
            <SheetRow
              onClick={() => {
                onCopySendLink();
              }}
            >
              {copiedSendLink ? (
                <Check className="size-4 shrink-0 text-primary" aria-hidden />
              ) : (
                <Smartphone className="size-4 shrink-0" aria-hidden />
              )}
              {copiedSendLink ? "Send link copied" : "Copy phone send link"}
            </SheetRow>
            <SheetRow onClick={onToggleSendUrl}>
              <Link2 className="size-4 shrink-0" aria-hidden />
              {showSendUrl ? "Hide send link" : "Show send link"}
            </SheetRow>
            <div className="my-1 h-px bg-border" role="separator" />
            <SheetRow
              destructive
              onClick={() => {
                setMoreOpen(false);
                onLeave();
              }}
            >
              <LogOut className="size-4 shrink-0" aria-hidden />
              Leave session
            </SheetRow>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
