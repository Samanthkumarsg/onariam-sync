"use client";

import { useCallback, useRef, useState } from "react";

import { WEBAI_SESSION_MODEL_ID } from "@/lib/webai-config";

export type WebAIStatus =
  | "idle"
  | "loading"
  | "ready"
  | "generating"
  | "error";

type WebAIInstance = {
  generate: (data: {
    userInput: { messages: { role: string; content: string }[] };
  }) => Promise<unknown>;
  generateStream?: (data: {
    userInput: { messages: { role: string; content: string }[] };
    onStream: (chunk: unknown) => void;
  }) => Promise<void>;
  terminate: () => void;
};

function extractGeneratedText(result: unknown): string {
  if (typeof result === "string") return result.trim();
  if (!result || typeof result !== "object") return "";
  const r = result as Record<string, unknown>;
  if (typeof r.text === "string") return r.text.trim();
  if (typeof r.content === "string") return r.content.trim();
  if (typeof r.output === "string") return r.output.trim();
  const choices = r.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
    const msg = (choices[0] as { message?: { content?: string } }).message
      ?.content;
    if (typeof msg === "string") return msg.trim();
  }
  return "";
}

export function useWebAI(modelId = WEBAI_SESSION_MODEL_ID) {
  const instanceRef = useRef<WebAIInstance | null>(null);
  const [status, setStatus] = useState<WebAIStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const init = useCallback(async () => {
    if (instanceRef.current) {
      setStatus("ready");
      return instanceRef.current;
    }
    setStatus("loading");
    setError(null);
    setProgress(0);
    try {
      const { WebAI } = await import("@axols/webai-js");
      const webai = await WebAI.create({ modelId });
      await webai.init({
        mode: "auto",
        onDownloadProgress: (p) => {
          setProgress(Math.round(p.progress ?? 0));
        },
      });
      instanceRef.current = webai as WebAIInstance;
      setStatus("ready");
      return instanceRef.current;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not load local AI";
      setError(message);
      setStatus("error");
      return null;
    }
  }, [modelId]);

  const generate = useCallback(
    async (prompt: string, system?: string) => {
      const webai = instanceRef.current ?? (await init());
      if (!webai) return null;

      setStatus("generating");
      setError(null);
      const messages: { role: string; content: string }[] = [];
      if (system?.trim()) {
        messages.push({ role: "system", content: system.trim() });
      }
      messages.push({ role: "user", content: prompt });

      try {
        const result = await webai.generate({ userInput: { messages } });
        const text = extractGeneratedText(result);
        setStatus("ready");
        return text || null;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Generation failed";
        setError(message);
        setStatus("error");
        return null;
      }
    },
    [init]
  );

  const terminate = useCallback(() => {
    instanceRef.current?.terminate();
    instanceRef.current = null;
    setStatus("idle");
    setProgress(0);
  }, []);

  return {
    status,
    progress,
    error,
    init,
    generate,
    terminate,
    isReady: status === "ready",
    isLoading: status === "loading",
    isGenerating: status === "generating",
  };
}
