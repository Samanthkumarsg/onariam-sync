/** Read plain text from the system clipboard (requires a recent user gesture). */

export async function readSystemClipboardText(): Promise<string | null> {
  try {
    if (!navigator.clipboard?.readText) return null;
    const text = await navigator.clipboard.readText();
    return text?.length ? text : null;
  } catch {
    return null;
  }
}
