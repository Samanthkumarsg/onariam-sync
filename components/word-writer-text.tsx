"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
  delay?: number;
  wordDelay?: number;
  as?: "p" | "span";
  onComplete?: () => void;
};

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort);
  });
}

export function WordWriterText({
  text,
  className,
  delay = 0,
  wordDelay = 140,
  as: Tag = "span",
  onComplete,
}: Props) {
  const words = text.trim().split(/\s+/);
  const [visibleCount, setVisibleCount] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const run = async () => {
      setVisibleCount(0);

      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduced) {
        setVisibleCount(words.length);
        onCompleteRef.current?.();
        return;
      }

      try {
        if (delay > 0) await wait(delay, signal);

        for (let i = 0; i < words.length; i++) {
          setVisibleCount(i + 1);
          if (i < words.length - 1) {
            await wait(wordDelay, signal);
          }
        }

        await wait(120, signal);
        onCompleteRef.current?.();
      } catch {
        /* aborted */
      }
    };

    void run();
    return () => controller.abort();
  }, [text, delay, wordDelay, words.length]);

  return (
    <Tag className={cn(className)}>
      {words.slice(0, visibleCount).map((word, i) => (
        <span
          key={`${i}-${word}`}
          className={cn(
            "mr-[0.28em] inline-block last:mr-0",
            i === visibleCount - 1 && "motion-safe:animate-word-in"
          )}
        >
          {word}
        </span>
      ))}
    </Tag>
  );
}
