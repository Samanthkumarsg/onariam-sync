/** Browser-only WebAI.js wrapper with safer init and response parsing. */

import type { LocalAiHandle } from "@/lib/local-ai-handle";
import { WEBAI_SESSION_MODEL_ID_SMALL } from "@/lib/webai-config";

export function isWebAIConfigurationError(error: unknown): boolean {
  const msg = formatWebAIError(error).toLowerCase();
  return (
    msg.includes("priorities list") ||
    (msg.includes("configurations") && msg.includes("mode, precision, device"))
  );
}

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

async function initWebAI(
  webai: Awaited<ReturnType<Awaited<ReturnType<typeof loadWebAIModule>>["WebAI"]["create"]>>,
  onDownloadProgress?: (pct: number) => void
) {
  const progress = (p: { progress?: number }) => {
    onDownloadProgress?.(Math.round(p.progress ?? 0));
  };

  try {
    await webai.init({ mode: "auto", onDownloadProgress: progress });
  } catch (autoError) {
    if (!isWebAIConfigurationError(autoError)) throw autoError;
    await webai.init({
      mode: "webai",
      device: "wasm",
      precision: "q4",
      onDownloadProgress: progress,
    });
  }
}

export async function createWebAIHandle(
  modelId = WEBAI_SESSION_MODEL_ID_SMALL,
  onDownloadProgress?: (pct: number) => void
): Promise<LocalAiHandle> {
  const { WebAI } = await loadWebAIModule();
  const webai = await WebAI.create({ modelId });

  await initWebAI(webai, onDownloadProgress);

  return {
    engine: "webai",
    async summarize(prompt: string, system?: string) {
      const messages: { role: string; content: string }[] = [];
      if (system?.trim()) {
        messages.push({ role: "system", content: system.trim() });
      }
      messages.push({ role: "user", content: prompt });

      try {
        const result = await webai.generate({
          userInput: { messages },
        });

        const text = extractWebAIResult(result);
        if (!text) {
          throw new Error("Model returned an empty response");
        }
        return text;
      } catch (generateError) {
        if (isWebAIConfigurationError(generateError)) {
          throw new Error(
            "WebAI could not run on this device. Reload and use the on-device summarizer."
          );
        }
        throw generateError;
      }
    },
    terminate() {
      webai.terminate();
    },
  };
}
