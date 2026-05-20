import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

import { normalizeBrowseUrl } from "@/lib/browse-proxy";
import { createClient } from "@/lib/client";
import { getMeetingState, setMeetingUrl } from "@/lib/meetings";

const URL_EVENT = "meeting-url-change";

type UrlPayload = {
  url: string;
  updatedAt: string;
};

export function useMeetingUrl({
  roomName,
  deviceFingerprint,
  isHost,
  initialUrl,
}: {
  roomName: string;
  deviceFingerprint: string;
  isHost: boolean;
  initialUrl: string | null;
}) {
  const [targetUrl, setTargetUrl] = useState(initialUrl ?? "");
  const [urlInput, setUrlInput] = useState(initialUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(
    null
  );

  const applyUrl = useCallback((url: string) => {
    setTargetUrl(url);
    if (isHost) {
      setUrlInput(url);
    }
  }, [isHost]);

  const broadcastUrl = useCallback((url: string) => {
    channelRef.current?.send({
      type: "broadcast",
      event: URL_EVENT,
      payload: { url, updatedAt: new Date().toISOString() } satisfies UrlPayload,
    });
  }, []);

  const navigateAsHost = useCallback(
    async (raw: string) => {
      if (!isHost) return;
      const normalized = normalizeBrowseUrl(raw);
      if (!normalized) return;
      setSaving(true);
      setError(null);
      try {
        const { target_url } = await setMeetingUrl(
          roomName,
          deviceFingerprint,
          normalized
        );
        applyUrl(target_url);
        broadcastUrl(target_url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update page");
      } finally {
        setSaving(false);
      }
    },
    [applyUrl, broadcastUrl, deviceFingerprint, isHost, roomName]
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`meeting-url:${roomName}`);

    channel
      .on("broadcast", { event: URL_EVENT }, (data: { payload: UrlPayload }) => {
        if (isHost) return;
        applyUrl(data.payload.url);
      })
      .subscribe((status) => {
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          channelRef.current = channel;
        } else {
          channelRef.current = null;
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [applyUrl, isHost, roomName]);

  useEffect(() => {
    if (isHost) return;

    let cancelled = false;

    const sync = async () => {
      try {
        const state = await getMeetingState(roomName, deviceFingerprint);
        if (!cancelled && state.target_url) {
          applyUrl(state.target_url);
        }
      } catch {
        /* member sync is best-effort */
      }
    };

    sync();
    const id = setInterval(sync, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [applyUrl, deviceFingerprint, isHost, roomName]);

  useEffect(() => {
    if (initialUrl) {
      applyUrl(initialUrl);
    }
  }, [applyUrl, initialUrl]);

  return {
    targetUrl,
    urlInput,
    setUrlInput,
    navigateAsHost,
    saving,
    error,
  };
}
