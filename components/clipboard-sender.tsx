"use client";

import { ClipboardPaste, Loader2, Send } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { OnariamLogo } from "@/components/onariam-logo";
import { Button } from "@/components/ui/button";
import { useClipboardP2p } from "@/hooks/use-clipboard-p2p";
import { useDeviceId } from "@/hooks/use-device-id";
import { formatMeetCode, isValidMeetCode } from "@/lib/meet-code";
import { input, panel } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  code: string;
};

export function ClipboardSender({ code }: Props) {
  const formatted = formatMeetCode(code);
  const valid = isValidMeetCode(formatted);
  const { deviceId, ready } = useDeviceId();
  const textareaId = useId();

  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  const p2p = useClipboardP2p({
    code: formatted,
    role: "mobile",
    localId: deviceId ? `mobile-${deviceId}` : "mobile-anon",
    enabled: valid && ready,
  });

  const pasteFromSystem = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) setText((prev) => (prev ? `${prev}\n${clip}` : clip));
    } catch {
      /* permission denied or unsupported */
    }
  };

  const handleSend = () => {
    if (p2p.sendText(text)) {
      setSent(true);
      setText("");
      setTimeout(() => setSent(false), 2000);
    }
  };

  useEffect(() => {
    if (p2p.status === "connected") setSent(false);
  }, [p2p.status]);

  if (!valid) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-destructive">Invalid session code.</p>
      </main>
    );
  }

  const statusText =
    p2p.status === "connected"
      ? "Connected — send to desktop"
      : p2p.status === "connecting"
        ? "Connecting to desktop…"
        : p2p.status === "failed"
          ? (p2p.error ?? "Connection failed")
          : "Open the sync page on your computer first, then send";

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-center border-b border-border py-4">
        <OnariamLogo href={null} />
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-6">
        <div className="text-center">
          <p className="font-mono text-sm text-muted-foreground">{formatted}</p>
          <p
            className={cn(
              "mt-2 text-sm",
              p2p.status === "connected"
                ? "text-emerald-500"
                : p2p.status === "failed"
                  ? "text-destructive"
                  : "text-muted-foreground"
            )}
          >
            {statusText}
          </p>
        </div>

        <div className={cn(panel, "flex flex-1 flex-col gap-4 p-4")}>
          <label htmlFor={textareaId} className="text-sm font-medium">
            Paste or type
          </label>
          <textarea
            id={textareaId}
            className={cn(input, "min-h-[200px] flex-1 resize-y font-sans text-base")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Links, notes, codes…"
            autoComplete="off"
            autoFocus
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => void pasteFromSystem()}
            >
              <ClipboardPaste className="size-4" aria-hidden />
              Paste from clipboard
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={
                !text.trim() ||
                p2p.status !== "connected" ||
                !ready
              }
              onClick={handleSend}
            >
              {p2p.status === "connecting" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              {sent ? "Sent" : "Send to browser"}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Transfers go directly to your computer (peer-to-peer). Nothing is saved
          on our servers.
        </p>
      </div>
    </main>
  );
}
