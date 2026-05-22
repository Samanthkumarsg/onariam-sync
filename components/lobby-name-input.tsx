"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { WordWriterText } from "@/components/word-writer-text";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /** Bump to replay the intro animation */
  resetKey?: number;
};

type Phase = "question" | "prompt" | "ready";

export function LobbyNameInput({
  value,
  onChange,
  onEnter,
  inputRef: externalRef,
  resetKey = 0,
}: Props) {
  const [phase, setPhase] = useState<Phase>("question");
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? internalRef;

  const restart = useCallback(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setPhase(reduced ? "ready" : "question");
  }, []);

  useEffect(() => {
    restart();
  }, [resetKey, restart]);

  const handleTitleComplete = useCallback(() => {
    setPhase("prompt");
  }, []);

  const handlePromptComplete = useCallback(() => {
    setPhase("ready");
  }, []);

  useEffect(() => {
    if (phase !== "ready") return;

    const id = window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 100);

    return () => window.clearTimeout(id);
  }, [phase, resetKey, inputRef]);

  const showCaret = phase === "ready" && value.length === 0;
  const showPrompt = phase === "prompt";

  return (
    <div className="space-y-5">
      <p className="text-center text-lg font-semibold tracking-tight text-foreground">
        {phase === "question" ? (
          <WordWriterText
            key={`title-${resetKey}`}
            text="What should we call you?"
            onComplete={handleTitleComplete}
          />
        ) : (
          "What should we call you?"
        )}
      </p>

      <div className="relative h-11 w-full">
        <div
          className={cn(
            "absolute inset-0 z-10 flex items-center justify-center",
            "transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            showPrompt
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-1 opacity-0"
          )}
          aria-hidden={!showPrompt}
        >
          <WordWriterText
            key={`prompt-${resetKey}`}
            text="Type your name"
            className="text-base text-muted-foreground"
            wordDelay={200}
            onComplete={handlePromptComplete}
          />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={64}
          autoComplete="nickname"
          aria-label="Display name"
          tabIndex={phase === "ready" ? 0 : -1}
          placeholder={phase === "ready" ? "Type your name" : undefined}
          className={cn(
            "relative z-20 h-11 w-full border-0 bg-transparent px-3 text-center text-base outline-none",
            phase === "ready"
              ? "text-foreground motion-safe:animate-lobby-input-flow opacity-100"
              : "pointer-events-none opacity-0",
            showCaret ? "caret-transparent" : "caret-primary"
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter") onEnter?.();
          }}
        />

        {showCaret && (
          <span
            className="pointer-events-none absolute top-1/2 left-1/2 z-30 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 motion-safe:animate-caret-blink rounded-full bg-primary"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
