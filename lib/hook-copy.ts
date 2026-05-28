/**
 * Hook-model UX copy (Trigger → Action → Reward → Investment).
 * Ethical utility hooks: habit of solving cross-device paste, not time-in-app.
 */

import { formatMeetCode } from "@/lib/meet-code";

/** External trigger: message when host shares the phone link. */
export function formatPhoneInviteClipboard(sendUrl: string, topic: string): string {
  const code = formatMeetCode(topic);
  return [
    "Paste on your phone — it appears on your computer.",
    "",
    sendUrl,
    "",
    `Session code: ${code}`,
  ].join("\n");
}

/** External trigger: host shares desktop sync link. */
export function formatDesktopInviteClipboard(syncUrl: string, topic: string): string {
  const code = formatMeetCode(topic);
  return [
    "Open on your computer to receive pastes from your phone.",
    "",
    syncUrl,
    "",
    `Session code: ${code}`,
  ].join("\n");
}

export const lobbyCopy = {
  headline: "Paste from phone to browser",
  subline: "When you need it on your computer, start here.",
  startCta: "Start session",
  joinCta: "Join with code",
  startWizardAvatarHint: "Shown in the session so others know it’s you.",
} as const;

export const emptyInboxCopy = {
  linkPhoneTitle: "Link your phone",
  linkPhoneBody: "Scan the QR or copy the link — paste there, and it lands here.",
  readyTitle: "Ready when you are",
  readyBody: "Paste on your phone or add from this device.",
  copyLinkCta: "Copy link for phone",
  copyLinkDone: "Link copied — open it on your phone",
  phoneConnected: "Phone connected — send when you’re ready",
  privacyNote: "Peer-to-peer when connected · inbox may sync over the session",
} as const;

export const sendScreenCopy = {
  title: "Send to desktop",
  placeholder: "Links, notes, codes…",
  pasteLabel: "Paste or type",
  sendCta: "Send to browser",
  sent: "Sent",
  delivered: "On desktop inbox",
  copied: "Copied on desktop",
  ready: "Paste below, then send",
  connecting: "Linking to your computer…",
  waitingDesktop: "Open the sync page on your computer first",
  joining: "Joining session…",
} as const;

export function sendStatusLine(
  p2pStatus: string,
  sendState: "idle" | "sent" | "delivered" | "copied",
  error: string | null
): string {
  if (p2pStatus === "connected") {
    if (sendState === "copied") return sendScreenCopy.copied;
    if (sendState === "delivered") return sendScreenCopy.delivered;
    if (sendState === "sent") return sendScreenCopy.sent;
    return sendScreenCopy.ready;
  }
  if (p2pStatus === "connecting") return sendScreenCopy.connecting;
  if (p2pStatus === "failed") return error ?? "Connection failed — open sync on desktop";
  return sendScreenCopy.waitingDesktop;
}

export function sendButtonLabel(
  sendState: "idle" | "sent" | "delivered" | "copied"
): string {
  if (sendState === "copied") return sendScreenCopy.copied;
  if (sendState === "delivered") return sendScreenCopy.delivered;
  if (sendState === "sent") return sendScreenCopy.sent;
  return sendScreenCopy.sendCta;
}

export const waitingHostCopy = {
  title: "Waiting for host",
  body: (displayName: string) =>
    `${displayName} — you'll send from here as soon as you're approved.`,
} as const;

export const rewardToast = {
  copiedToClipboard: "Copied to clipboard",
  latestAutoCopy: "Latest paste copied for you",
} as const;
