import { NextResponse } from "next/server";

import { DEFAULT_ICE_SERVERS } from "@/lib/ice-servers";

function parseTurnUrls(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
}

/** Returns ICE servers for WebRTC. TURN credentials stay server-side (env only). */
export async function GET() {
  const turnUrls = parseTurnUrls(process.env.TURN_URLS);
  const username = process.env.TURN_USERNAME?.trim();
  const credential = process.env.TURN_CREDENTIAL?.trim();

  const iceServers: RTCIceServer[] = [...DEFAULT_ICE_SERVERS];

  if (turnUrls.length > 0 && username && credential) {
    iceServers.push({
      urls: turnUrls,
      username,
      credential,
    });
  }

  return NextResponse.json(
    { iceServers },
    {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    }
  );
}
