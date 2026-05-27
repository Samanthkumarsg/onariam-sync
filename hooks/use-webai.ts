"use client";

import { useCallback, useRef, useState } from "react";

import { createLocalAiHandle } from "@/lib/ai-init";
import { shouldSkipWebAI } from "@/lib/ai-device";
import type { LocalAiEngine, LocalAiHandle } from "@/lib/local-ai-handle";
import {
  createTransformersHandle,
  resetSummarizer,
} from "@/lib/local-ai-summarize";
import {
  formatWebAIError,
  isWebAIConfigurationError,
} from "@/lib/webai-client";

export type WebAIStatus =
  | "idle"
  | "loading"
  | "ready"
  | "generating"
  | "error";

export type { LocalAiEngine };

export function useWebAI() {
  const handleRef = useRef<LocalAiHandle | null>(null);
  const [status, setStatus] = useState<WebAIStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<LocalAiEngine | null>(null);

  const init = useCallback(async () => {
    if (typeof window === "undefined") {
      setError("Local AI runs in the browser only");
      setStatus("error");
      return null;
    }

    if (handleRef.current) {
      setEngine(handleRef.current.engine);
      setStatus("ready");
      return handleRef.current;
    }

    setStatus("loading");
    setError(null);
    setProgress(0);
    setEngine(null);

    try {
      const handle = await createLocalAiHandle(setProgress);
      handleRef.current = handle;
      setEngine(handle.engine);
      setStatus("ready");
      setProgress(100);
      return handle;
    } catch (e) {
      const message = formatWebAIError(e);
      setError(
        message ||
          (shouldSkipWebAI()
            ? "Could not load the on-device summarizer. Try Wi‑Fi and reload."
            : "Could not load local AI. Check your connection and try again.")
      );
      setStatus("error");
      return null;
    }
  }, []);

  const generate = useCallback(
    async (prompt: string, system?: string) => {
      let handle = handleRef.current;
      if (!handle) {
        handle = (await init()) ?? null;
      }
      if (!handle) return null;

      setStatus("generating");
      setError(null);

      try {
        const text = await handle.summarize(prompt, system);
        setStatus("ready");
        return text || null;
      } catch (e) {
        if (
          handle.engine === "webai" &&
          isWebAIConfigurationError(e)
        ) {
          handle.terminate();
          handleRef.current = null;
          try {
            const fallback = await createTransformersHandle(setProgress);
            handleRef.current = fallback;
            setEngine("transformers");
            const text = await fallback.summarize(prompt, system);
            setStatus("ready");
            setProgress(100);
            return text || null;
          } catch (fallbackError) {
            const message = formatWebAIError(fallbackError);
            setError(message);
            setStatus("error");
            return null;
          }
        }

        const message = formatWebAIError(e);
        setError(message);
        setStatus("error");
        return null;
      }
    },
    [init]
  );

  const terminate = useCallback(() => {
    handleRef.current?.terminate();
    handleRef.current = null;
    resetSummarizer();
    setStatus("idle");
    setProgress(0);
    setEngine(null);
  }, []);

  const retry = useCallback(() => {
    terminate();
    setError(null);
    void init();
  }, [init, terminate]);

  return {
    status,
    progress,
    error,
    engine,
    init,
    generate,
    terminate,
    retry,
    isReady: status === "ready",
    isLoading: status === "loading",
    isGenerating: status === "generating",
    skipsWebAiLlm: shouldSkipWebAI(),
  };
}
