/** WebRTC clipboard sync — signaling only via Supabase; payload stays peer-to-peer */

import { fileBoardLabel } from "@/lib/ipfs";
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

type ClipboardPayloadMeta = {
  at: number;
  id: string;
  /** Reply target — points at the card being replied to */
  parentId?: string;
  source?: ClipboardPayloadSource;
  author?: string;
  authorAvatar?: string;
  authorDeviceFingerprint?: string;
  assignee?: ClipboardPayloadAssignee | null;
};

export type ClipboardTextPayload = ClipboardPayloadMeta & {
  type: "text";
  text: string;
  html?: string;
};

export type ClipboardFilePayload = ClipboardPayloadMeta & {
  type: "file";
  cid: string;
  name: string;
  mimeType: string;
  size: number;
  /** Board display label */
  text: string;
};

/** @deprecated Use ClipboardTextPayload — kept for gradual migration */
export type ClipboardPayload = ClipboardTextPayload | ClipboardFilePayload;

export type ClipboardAck = {
  type: "ack";
  id: string;
  copied: boolean;
  at: number;
};

export type ClipboardWireMessage =
  | ClipboardTextPayload
  | ClipboardFilePayload
  | ClipboardAck;

export function clipboardChannelName(code: string): string {
  return `clipboard:${code}`;
}

export function createClipboardPayload(
  text: string,
  options?: {
    html?: string;
    source?: ClipboardPayloadSource;
    author?: string;
    authorAvatar?: string;
    authorDeviceFingerprint?: string;
    assignee?: ClipboardPayloadAssignee | null;
    parentId?: string;
    id?: string;
    at?: number;
  }
): ClipboardTextPayload {
  return {
    type: "text",
    text,
    html: sanitizeClipboardHtml(options?.html),
    at: options?.at ?? Date.now(),
    id: options?.id ?? crypto.randomUUID(),
    source: options?.source,
    author: options?.author,
    authorAvatar: options?.authorAvatar,
    authorDeviceFingerprint: options?.authorDeviceFingerprint,
    assignee: options?.assignee,
    parentId: options?.parentId,
  };
}

export function createClipboardFilePayload(
  file: { cid: string; name: string; mimeType: string; size: number },
  options?: {
    source?: ClipboardPayloadSource;
    author?: string;
    authorAvatar?: string;
    authorDeviceFingerprint?: string;
    assignee?: ClipboardPayloadAssignee | null;
    parentId?: string;
    id?: string;
    at?: number;
  }
): ClipboardFilePayload {
  return {
    type: "file",
    cid: file.cid,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    text: fileBoardLabel(file.name),
    at: options?.at ?? Date.now(),
    id: options?.id ?? crypto.randomUUID(),
    source: options?.source,
    author: options?.author,
    authorAvatar: options?.authorAvatar,
    authorDeviceFingerprint: options?.authorDeviceFingerprint,
    assignee: options?.assignee,
    parentId: options?.parentId,
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

function parsePayloadMeta(
  parsed: Partial<ClipboardPayloadMeta>
): Omit<ClipboardPayloadMeta, "at" | "id"> & { at: number; id: string } {
  return {
    at: typeof parsed.at === "number" ? parsed.at : Date.now(),
    id: typeof parsed.id === "string" ? parsed.id : crypto.randomUUID(),
    source:
      parsed.source === "mobile" ||
      parsed.source === "desktop" ||
      parsed.source === "host"
        ? parsed.source
        : undefined,
    author: typeof parsed.author === "string" ? parsed.author : undefined,
    authorAvatar:
      typeof parsed.authorAvatar === "string" ? parsed.authorAvatar : undefined,
    authorDeviceFingerprint:
      typeof parsed.authorDeviceFingerprint === "string"
        ? parsed.authorDeviceFingerprint
        : undefined,
    parentId:
      typeof parsed.parentId === "string" && parsed.parentId.length > 0
        ? parsed.parentId
        : undefined,
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

export function decodeClipboardWireMessage(
  raw: string
): ClipboardWireMessage | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.type === "ack" && typeof parsed.id === "string") {
      return {
        type: "ack",
        id: parsed.id,
        copied: Boolean(parsed.copied),
        at: typeof parsed.at === "number" ? parsed.at : Date.now(),
      };
    }

    if (
      parsed.type === "file" &&
      typeof parsed.cid === "string" &&
      typeof parsed.name === "string"
    ) {
      const meta = parsePayloadMeta(parsed as Partial<ClipboardPayloadMeta>);
      return {
        type: "file",
        cid: parsed.cid,
        name: parsed.name,
        mimeType:
          typeof parsed.mimeType === "string"
            ? parsed.mimeType
            : "application/octet-stream",
        size: typeof parsed.size === "number" ? parsed.size : 0,
        text:
          typeof parsed.text === "string"
            ? parsed.text
            : fileBoardLabel(parsed.name),
        ...meta,
      };
    }

    if (
      (parsed.type === "text" || parsed.type === undefined) &&
      typeof parsed.text === "string"
    ) {
      const meta = parsePayloadMeta(parsed as Partial<ClipboardPayloadMeta>);
      return {
        type: "text",
        text: parsed.text,
        html: sanitizeClipboardHtml(
          typeof parsed.html === "string" ? parsed.html : undefined
        ),
        ...meta,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function isFilePayload(
  payload: ClipboardPayload
): payload is ClipboardFilePayload {
  return payload.type === "file";
}

export function isTextPayload(
  payload: ClipboardPayload
): payload is ClipboardTextPayload {
  return payload.type === "text" || payload.type === undefined;
}
