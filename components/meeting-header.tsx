"use client";

import { Copy, Link2, LogOut } from "lucide-react";
import { type FormEvent, type ReactNode } from "react";

import { OnariamLogo } from "@/components/onariam-logo";
import { Button } from "@/components/ui/button";
import { btnGhost, chip, input } from "@/lib/ui";
import { cn } from "@/lib/utils";

function ToolbarDivider() {
  return <div className="hidden h-5 w-px shrink-0 bg-border sm:block" aria-hidden />;
}

type Props = {
  topic: string;
  displayName: string;
  avatar: string;
  isHost: boolean;
  copiedLink: boolean;
  copiedCode: boolean;
  onCopyLink: () => void;
  onCopyCode: () => void;
  onLeave: () => void;
  urlBar?: ReactNode;
};

export function MeetingHeader({
  topic,
  displayName,
  avatar,
  isHost,
  copiedLink,
  copiedCode,
  onCopyLink,
  onCopyCode,
  onLeave,
  urlBar,
}: Props) {
  return (
    <header className="z-40 shrink-0 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="flex h-12 items-center gap-3 px-3 sm:gap-4 sm:px-4">
        <OnariamLogo size="sm" />

        <ToolbarDivider />

        <section
          className="flex min-w-0 items-center gap-2"
          aria-label="Session"
        >
          <span className="hidden text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:inline">
            Room
          </span>
          <code className={cn(chip, "max-w-[140px] truncate sm:max-w-none")}>
            {topic}
          </code>
          {isHost && (
            <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
              Host
            </span>
          )}
        </section>

        <div className="min-w-2 flex-1" />

        <section
          className="flex items-center rounded-lg border border-border bg-surface-elevated/60 p-0.5"
          aria-label="Share session"
        >
          <button
            type="button"
            onClick={onCopyLink}
            className={cn(
              btnGhost,
              "inline-flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5"
            )}
          >
            <Link2 className="size-3.5 shrink-0 opacity-70" aria-hidden />
            <span className="hidden sm:inline">
              {copiedLink ? "Copied" : "Link"}
            </span>
            <span className="sm:hidden">{copiedLink ? "✓" : ""}</span>
          </button>
          <span className="h-4 w-px bg-border" aria-hidden />
          <button
            type="button"
            onClick={onCopyCode}
            className={cn(
              btnGhost,
              "inline-flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5"
            )}
          >
            <Copy className="size-3.5 shrink-0 opacity-70" aria-hidden />
            <span className="hidden sm:inline">
              {copiedCode ? "Copied" : "Code"}
            </span>
            <span className="sm:hidden">{copiedCode ? "✓" : ""}</span>
          </button>
        </section>

        <ToolbarDivider />

        <section
          className="flex min-w-0 max-w-[140px] items-center gap-2 sm:max-w-[180px]"
          aria-label="You"
        >
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-base ring-1 ring-white/[0.04]"
            aria-hidden
          >
            {avatar}
          </span>
          <span className="truncate text-sm text-ink-muted" title={displayName}>
            {displayName}
          </span>
        </section>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLeave}
          className="shrink-0 gap-1.5"
        >
          <LogOut className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Leave</span>
        </Button>
      </div>

      {urlBar}
    </header>
  );
}

type MeetingUrlBarProps = {
  urlInput: string;
  saving: boolean;
  error: string | null;
  onUrlInputChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
};

export function MeetingUrlBar({
  urlInput,
  saving,
  error,
  onUrlInputChange,
  onSubmit,
}: MeetingUrlBarProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex cursor-auto items-center gap-2 border-t border-border bg-surface-elevated/30 px-3 py-2 sm:px-4"
      aria-label="Navigate shared page"
    >
      <label
        htmlFor="meet-url"
        className="hidden shrink-0 text-xs font-medium text-muted-foreground sm:block"
      >
        URL
      </label>
      <input
        id="meet-url"
        type="text"
        className={cn(input, "min-w-0 flex-1 font-mono text-[13px]")}
        value={urlInput}
        onChange={(e) => onUrlInputChange(e.target.value)}
        placeholder="https://example.com"
        spellCheck={false}
        autoComplete="url"
      />
      <Button type="submit" size="sm" disabled={saving || !urlInput.trim()}>
        {saving ? "…" : "Go"}
      </Button>
      {error && (
        <p className="sr-only sm:not-sr-only text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
