"use client";

import { Wifi, WifiOff } from "lucide-react";

import { useClipboardP2p } from "@/hooks/use-clipboard-p2p";
import { cn } from "@/lib/utils";

export function connectionStatusLabel(
  status: ReturnType<typeof useClipboardP2p>["status"],
  error: string | null
) {
  if (error) return error;
  switch (status) {
    case "connected":
      return "Phone linked";
    case "failed":
      return "Couldn't connect";
    case "connecting":
      return "Linking phone…";
    case "waiting":
      return "Phone not linked";
    default:
      return "Starting…";
  }
}

type Props = {
  status: ReturnType<typeof useClipboardP2p>["status"];
  error: string | null;
  className?: string;
  compact?: boolean;
};

export function SessionConnectionBadge({
  status,
  error,
  className,
  compact,
}: Props) {
  const connected = status === "connected";
  const failed = status === "failed";

  return (
    <div
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-2 rounded-md border font-medium",
        compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs",
        connected &&
          "border-accent-foreground/30 bg-accent text-accent-foreground",
        failed && "border-destructive/35 bg-destructive/10 text-destructive",
        !connected &&
          !failed &&
          "border-amber-500/40 bg-amber-500/5 text-amber-800",
        className
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
          className="size-2 shrink-0 animate-pulse rounded-full bg-amber-600"
          aria-hidden
        />
      )}
      <span className="truncate">{connectionStatusLabel(status, error)}</span>
    </div>
  );
}
