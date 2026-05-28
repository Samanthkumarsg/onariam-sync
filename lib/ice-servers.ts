/** WebRTC ICE server config — STUN defaults; TURN from /api/ice when configured. */

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

let cached: RTCIceServer[] | null = null;
let inflight: Promise<RTCIceServer[]> | null = null;

export async function fetchIceServers(): Promise<RTCIceServer[]> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch("/api/ice", { cache: "no-store" });
      if (!res.ok) return DEFAULT_ICE_SERVERS;
      const data = (await res.json()) as { iceServers?: RTCIceServer[] };
      const servers = Array.isArray(data.iceServers) ? data.iceServers : [];
      if (servers.length === 0) return DEFAULT_ICE_SERVERS;
      cached = servers;
      return servers;
    } catch {
      return DEFAULT_ICE_SERVERS;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function clearIceServersCache(): void {
  cached = null;
}
