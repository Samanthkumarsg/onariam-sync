"use client";

import { Loader2, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useWebAI } from "@/hooks/use-webai";
import type { ClipboardInboxItem } from "@/lib/clipboard-inbox-storage";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latestItem?: ClipboardInboxItem | null;
};

export function SessionAiPanel({ open, onOpenChange, latestItem }: Props) {
  const webai = useWebAI();
  const [output, setOutput] = useState("");

  const handleEnable = () => {
    void webai.init();
  };

  const handleSummarize = () => {
    if (!latestItem?.text?.trim() && !latestItem?.html) return;
    const snippet =
      latestItem.text.trim().slice(0, 2000) ||
      latestItem.html?.replace(/<[^>]+>/g, " ").slice(0, 2000) ||
      "";
    void (async () => {
      setOutput("");
      const result = await webai.generate(
        `Summarize this clipboard note in 1–2 short sentences:\n\n${snippet}`,
        "You help summarize shared session clipboard notes. Be brief and neutral."
      );
      if (result) setOutput(result);
    })();
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      webai.terminate();
      setOutput("");
    }
    onOpenChange(next);
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[min(85dvh,520px)]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            Local AI (WebAI)
          </DrawerTitle>
          <DrawerDescription>
            Runs in your browser via WebAI.js. Clipboard text never leaves this
            device.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-4 pb-6">
          {webai.status === "idle" && (
            <Button
              type="button"
              className="w-full"
              onClick={handleEnable}
            >
              Enable local AI
            </Button>
          )}

          {webai.isLoading && (
            <div
              className="flex items-center gap-2 text-sm text-muted-foreground"
              role="status"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading model… {webai.progress > 0 ? `${webai.progress}%` : ""}
            </div>
          )}

          {webai.error && (
            <p className="text-sm text-destructive" role="alert">
              {webai.error}
            </p>
          )}

          {(webai.isReady || webai.isGenerating) && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!latestItem || webai.isGenerating}
                onClick={handleSummarize}
              >
                {webai.isGenerating ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : null}
                Summarize latest note
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => webai.terminate()}
              >
                <X className="size-3.5" aria-hidden />
                Unload model
              </Button>
            </div>
          )}

          {output ? (
            <div
              className={cn(
                "rounded-md border border-border bg-card p-3 text-sm leading-relaxed text-foreground"
              )}
            >
              {output}
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
