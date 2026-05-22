/** WebRTC clipboard sync — signaling only via Supabase; payload stays peer-to-peer */

export const CLIPBOARD_SIGNAL_EVENT = "clipboard-webrtc-signal";

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export type ClipboardPeerRole = "desktop" | "mobile";

export type ClipboardSignalMessage = {
  from: string;
  kind: "hello" | "desktop-ready" | "offer" | "answer" | "ice";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export type ClipboardPayload = {
  type: "text";
  text: string;
  at: number;
};

export function clipboardChannelName(code: string): string {
  return `clipboard:${code}`;
}

export function encodeClipboardPayload(text: string): string {
  const payload: ClipboardPayload = {
    type: "text",
    text,
    at: Date.now(),
  };
  return JSON.stringify(payload);
}

export function decodeClipboardPayload(raw: string): ClipboardPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ClipboardPayload>;
    if (parsed.type !== "text" || typeof parsed.text !== "string") return null;
    return {
      type: "text",
      text: parsed.text,
      at: typeof parsed.at === "number" ? parsed.at : Date.now(),
    };
  } catch {
    return null;
  }
}
