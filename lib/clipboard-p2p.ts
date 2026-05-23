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
  id: string;
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

export function encodeClipboardPayload(text: string): string {
  const payload: ClipboardPayload = {
    type: "text",
    text,
    at: Date.now(),
    id: crypto.randomUUID(),
  };
  return JSON.stringify(payload);
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
        at: typeof parsed.at === "number" ? parsed.at : Date.now(),
        id: typeof parsed.id === "string" ? parsed.id : crypto.randomUUID(),
      };
    }
    return null;
  } catch {
    return null;
  }
}
