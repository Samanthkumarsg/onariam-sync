/** Read plain text from the system clipboard (requires a recent user gesture). */

export type ClipboardReadError = "unsupported" | "denied" | "empty";

export type ClipboardReadResult = {
  text: string | null;
  error?: ClipboardReadError;
};

export async function readSystemClipboard(): Promise<ClipboardReadResult> {
  try {
    if (!navigator.clipboard?.readText) {
      return { text: null, error: "unsupported" };
    }
    const text = await navigator.clipboard.readText();
    if (!text?.length) return { text: null, error: "empty" };
    return { text };
  } catch {
    return { text: null, error: "denied" };
  }
}

export async function readSystemClipboardText(): Promise<string | null> {
  const result = await readSystemClipboard();
  return result.text;
}
