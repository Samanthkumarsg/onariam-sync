"use client";

import { Download, Eraser } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { touchTarget } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemCount: number;
  onSave: () => void;
  onErase: () => void;
};

export function LeaveSessionDialog({
  open,
  onOpenChange,
  itemCount,
  onSave,
  onErase,
}: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-card">
        <DrawerHeader className="text-left">
          <DrawerTitle>Leave session?</DrawerTitle>
          <DrawerDescription>
            {itemCount > 0
              ? `You have ${itemCount} clipboard item${itemCount === 1 ? "" : "s"} on the board. Save them before leaving, or erase and exit.`
              : "Board items from this session are only stored on this device."}
          </DrawerDescription>
        </DrawerHeader>

        <DrawerFooter className="flex flex-col gap-2 pt-0">
          {itemCount > 0 && (
            <Button
              type="button"
              variant="secondary"
              className={cn(touchTarget, "h-11 w-full")}
              onClick={onSave}
            >
              <Download className="size-4" aria-hidden />
              Save as .txt
            </Button>
          )}
          <Button
            type="button"
            variant={itemCount > 0 ? "outline" : "default"}
            className={cn(touchTarget, "h-11 w-full")}
            onClick={onErase}
          >
            <Eraser className="size-4" aria-hidden />
            {itemCount > 0 ? "Erase & leave" : "Leave"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
