"use client";

import { useCallback, useRef, useState } from "react";

import {
  loadSummarizer,
  resetSummarizer,
  summarizeWithTransformers,
} from "@/lib/local-ai-summarize";
import {
  createWebAIHandle,
  formatWebAIError,
  type LocalAiHandle,
} from "@/lib/webai-client";

export type WebAIStatus =
  | "idle"
  | "loading"
  | "ready"
  | "generating"
  | "error";

export type LocalAiEngine = "webai" | "transformers" | null;

export function useWebAI() {
  const handleRef = useRef<LocalAiHandle | null>(null);
  const [status, setStatus] = useState<WebAIStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<LocalAiEngine>(null);

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
      const handle = await createWebAIHandle(undefined, setProgress);
      handleRef.current = handle;
      setEngine("webai");
      setStatus("ready");
      return handle;
    } catch (webaiError) {
      console.warn("[WebAI] primary engine failed, using Transformers.js", webaiError);
      try {
        await loadSummarizer(setProgress);
        handleRef.current = {
          engine: "transformers",
          async summarize(prompt: string) {
            const userPart = prompt.includes("\n\n")
              ? prompt.split("\n\n").pop() ?? prompt
              : prompt;
            return summarizeWithTransformers(userPart, setProgress);
          },
          terminate() {
            resetSummarizer();
          },
        };
        setEngine("transformers");
        setStatus("ready");
        setProgress(100);
        return handleRef.current;
      } catch (fallbackError) {
        const message = formatWebAIError(webaiError || fallbackError);
        setError(
          message ||
            "Could not load local AI. Check your connection and try again."
        );
        setStatus("error");
        return null;
      }
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
  };
}
