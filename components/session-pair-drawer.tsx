"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SessionPairHero } from "@/components/session-pair-hero";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sendUrl: string;
  copiedSendLink: boolean;
  onCopySendLink: () => void;
  showSendUrl: boolean;
  onToggleSendUrl: () => void;
};

export function SessionPairDrawer({
  open,
  onOpenChange,
  sendUrl,
  copiedSendLink,
  onCopySendLink,
  showSendUrl,
  onToggleSendUrl,
}: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[min(90dvh,640px)] border-border/60 bg-background">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Link your phone</DrawerTitle>
          <DrawerDescription>
            Scan to open the send page on your phone
          </DrawerDescription>
        </DrawerHeader>
        <SessionPairHero
          sendUrl={sendUrl}
          copiedSendLink={copiedSendLink}
          onCopySendLink={onCopySendLink}
          showSendUrl={showSendUrl}
          onToggleSendUrl={onToggleSendUrl}
          className="bg-transparent"
        />
      </DrawerContent>
    </Drawer>
  );
}
