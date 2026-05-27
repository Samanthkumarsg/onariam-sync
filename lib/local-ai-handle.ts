export type LocalAiEngine = "edge" | "webai" | "transformers";

export type LocalAiHandle = {
  engine: LocalAiEngine;
  summarize: (prompt: string, system?: string) => Promise<string>;
  terminate: () => void;
};

/** Pull user content from our summarize prompt template. */
export function extractUserPrompt(prompt: string): string {
  const marker = "\n\n";
  if (prompt.includes(marker)) {
    return prompt.split(marker).pop()?.trim() ?? prompt.trim();
  }
  return prompt.trim();
}
