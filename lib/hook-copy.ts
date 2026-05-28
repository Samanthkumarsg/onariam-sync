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

export const emptyBoardCopy = {
  linkPhoneTitle: "Link your phone",
  linkPhoneBody:
    "Your phone is the notepad; this board is your desktop. Scan or copy the link, paste there, and it appears here.",
  readyTitle: "Ready when you are",
  readyBody: "Paste on your phone or add from this device — everything lands on the board.",
  copyLinkCta: "Copy link for phone",
  copyLinkDone: "Link copied — open it on your phone",
  phoneConnected: "Phone connected — send when you’re ready",
  privacyNote:
    "Direct peer link when possible · host controls who joins · session clears in 24h",
} as const;

/** @deprecated Use emptyBoardCopy */
export const emptyInboxCopy = emptyBoardCopy;

export const sendScreenCopy = {
  title: "Send to desktop",
  placeholder: "Links, notes, codes…",
  pasteLabel: "Paste or type",
  sendCta: "Send to desktop",
  sent: "Sent",
  delivered: "On your board",
  copied: "Copied on desktop",
  ready: "Paste below, then send",
  connecting: "Linking to your computer…",
  waitingDesktop: "Waiting for your computer — open the sync page with this code",
  joining: "Joining session…",
} as const;

export const desktopBoardCopy = {
  waitingPhone: "Waiting for your phone — open the send link or scan the QR",
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
  addedToBoard: "Pasted to board",
} as const;

export const hostToast = {
  pending: (count: number) =>
    count === 1
      ? "Someone wants to join — open People (↑) to accept"
      : `${count} people waiting — open People to accept`,
  approved: (name: string) => `${name} joined the board`,
  declined: (name: string) => `Declined ${name}`,
} as const;
