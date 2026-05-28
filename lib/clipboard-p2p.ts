/** WebRTC clipboard sync — signaling only via Supabase; payload stays peer-to-peer */

import { sanitizeClipboardHtml } from "@/lib/sanitize-html";

export const CLIPBOARD_SIGNAL_EVENT = "clipboard-webrtc-signal";

/** @deprecated Use fetchIceServers() — kept for tests and fallbacks */
export { DEFAULT_ICE_SERVERS as ICE_SERVERS } from "@/lib/ice-servers";

export type ClipboardPeerRole = "desktop" | "mobile";

export type ClipboardSignalMessage = {
  from: string;
  kind: "hello" | "desktop-ready" | "offer" | "answer" | "ice";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export type ClipboardPayloadSource = "mobile" | "desktop" | "host";

export type ClipboardPayloadAssignee = {
  deviceFingerprint: string;
  displayName: string;
  avatar: string;
};

export type ClipboardPayload = {
  type: "text";
  text: string;
  html?: string;
  at: number;
  id: string;
  source?: ClipboardPayloadSource;
  author?: string;
  assignee?: ClipboardPayloadAssignee | null;
};

export type ClipboardAck = {
  type: "ack";
  id: string;
  copied: boolean;
  at: number;
};

export type ClipboardWireMessage = ClipboardPayload | ClipboardAck;

export function clipboardChannelName(code: string): string {
  return `clipboard:${code}`;
}

export function createClipboardPayload(
  text: string,
  options?: {
    html?: string;
    source?: ClipboardPayloadSource;
    author?: string;
    assignee?: ClipboardPayloadAssignee | null;
    id?: string;
    at?: number;
  }
): ClipboardPayload {
  return {
    type: "text",
    text,
    html: sanitizeClipboardHtml(options?.html),
    at: options?.at ?? Date.now(),
    id: options?.id ?? crypto.randomUUID(),
    source: options?.source,
    author: options?.author,
    assignee: options?.assignee,
  };
}

export function encodeClipboardPayload(
  text: string,
  options?: Parameters<typeof createClipboardPayload>[1]
): string {
  return JSON.stringify(createClipboardPayload(text, options));
}

export function encodeClipboardAck(id: string, copied: boolean): string {
  const ack: ClipboardAck = {
    type: "ack",
    id,
    copied,
    at: Date.now(),
  };
  return JSON.stringify(ack);
}

export function decodeClipboardWireMessage(
  raw: string
): ClipboardWireMessage | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ClipboardWireMessage>;
    if (parsed.type === "ack" && typeof parsed.id === "string") {
      return {
        type: "ack",
        id: parsed.id,
        copied: Boolean(parsed.copied),
        at: typeof parsed.at === "number" ? parsed.at : Date.now(),
      };
    }
    if (parsed.type === "text" && typeof parsed.text === "string") {
      return {
        type: "text",
        text: parsed.text,
        html: sanitizeClipboardHtml(
          typeof parsed.html === "string" ? parsed.html : undefined
        ),
        at: typeof parsed.at === "number" ? parsed.at : Date.now(),
        id: typeof parsed.id === "string" ? parsed.id : crypto.randomUUID(),
        source:
          parsed.source === "mobile" ||
          parsed.source === "desktop" ||
          parsed.source === "host"
            ? parsed.source
            : undefined,
        author: typeof parsed.author === "string" ? parsed.author : undefined,
        assignee:
          parsed.assignee &&
          typeof parsed.assignee === "object" &&
          typeof parsed.assignee.deviceFingerprint === "string"
            ? {
                deviceFingerprint: parsed.assignee.deviceFingerprint,
                displayName:
                  typeof parsed.assignee.displayName === "string"
                    ? parsed.assignee.displayName
                    : "Guest",
                avatar:
                  typeof parsed.assignee.avatar === "string"
                    ? parsed.assignee.avatar
                    : "🦊",
              }
            : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}
