/** Browser-only WebAI.js wrapper with safer init and response parsing. */

import { WEBAI_SESSION_MODEL_ID } from "@/lib/webai-config";

const WEBAI_PRIORITIES = [
  { mode: "webai" as const, precision: "q4" as const, device: "webgpu" as const },
  { mode: "webai" as const, precision: "q4" as const, device: "wasm" as const },
  { mode: "webai" as const, precision: "q8" as const, device: "wasm" as const },
];

export type WebAIModule = typeof import("@axols/webai-js");

export function formatWebAIError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.replace(/^\[[^\]]+:[^\]]+\]\s*/, "");
  }
  return "Something went wrong";
}

export function extractWebAIResult(result: unknown): string {
  if (result == null) return "";
  if (typeof result === "string") return result.trim();

  if (typeof result === "object") {
    const r = result as Record<string, unknown>;

    if (typeof r.result === "string") return r.result.trim();
    if (typeof r.text === "string") return r.text.trim();
    if (typeof r.content === "string") return r.content.trim();
    if (typeof r.output === "string") return r.output.trim();

    if (typeof r.result === "object" && r.result) {
      const nested = extractWebAIResult(r.result);
      if (nested) return nested;
    }

    const choices = r.choices;
    if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
      const msg = (choices[0] as { message?: { content?: string } }).message
        ?.content;
      if (typeof msg === "string") return msg.trim();
    }
  }

  return "";
}

export async function loadWebAIModule(): Promise<WebAIModule> {
  if (typeof window === "undefined") {
    throw new Error("WebAI runs in the browser only");
  }
  return import("@axols/webai-js");
}

export type LocalAiHandle = {
  engine: "webai" | "transformers";
  summarize: (prompt: string, system?: string) => Promise<string>;
  terminate: () => void;
};

export async function createWebAIHandle(
  modelId = WEBAI_SESSION_MODEL_ID,
  onDownloadProgress?: (pct: number) => void
): Promise<LocalAiHandle> {
  const { WebAI, checkIsWebGPUAvailable } = await loadWebAIModule();

  const webgpu = await checkIsWebGPUAvailable();
  if (!webgpu) {
    console.warn("[WebAI] WebGPU unavailable; using WASM fallback");
  }

  const webai = await WebAI.create({ modelId });

  await webai.init({
    mode: "auto",
    priorities: WEBAI_PRIORITIES,
    onDownloadProgress: (p) => {
      onDownloadProgress?.(Math.round(p.progress ?? 0));
    },
  });

  return {
    engine: "webai",
    async summarize(prompt: string, system?: string) {
      const messages: { role: string; content: string }[] = [];
      if (system?.trim()) {
        messages.push({ role: "system", content: system.trim() });
      }
      messages.push({ role: "user", content: prompt });

      const result = await webai.generate({
        userInput: { messages },
      });

      const text = extractWebAIResult(result);
      if (!text) {
        throw new Error("Model returned an empty response");
      }
      return text;
    },
    terminate() {
      webai.terminate();
    },
  };
}
