"use client";

import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef } from "react";

import { createClient } from "@/lib/client";
import type { ClipboardInboxItem } from "@/lib/clipboard-inbox-storage";
import {
  CLIPBOARD_INBOX_EVENT,
  inboxChannelName,
  isInboxRoomMessage,
  type ClipboardInboxRoomMessage,
} from "@/lib/clipboard-room";

type Options = {
  topic: string;
  deviceFingerprint: string;
  enabled?: boolean;
  getItems: () => ClipboardInboxItem[];
  onUpsert: (item: ClipboardInboxItem) => void;
  onMergeBatch: (items: ClipboardInboxItem[]) => void;
};

export function useClipboardRoomSync({
  topic,
  deviceFingerprint,
  enabled = true,
  getItems,
  onUpsert,
  onMergeBatch,
}: Options) {
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  const getItemsRef = useRef(getItems);
  const onUpsertRef = useRef(onUpsert);
  const onMergeBatchRef = useRef(onMergeBatch);
  const syncRequestedRef = useRef(false);

  getItemsRef.current = getItems;
  onUpsertRef.current = onUpsert;
  onMergeBatchRef.current = onMergeBatch;

  const publish = useCallback((message: ClipboardInboxRoomMessage) => {
    channelRef.current?.send({
      type: "broadcast",
      event: CLIPBOARD_INBOX_EVENT,
      payload: message,
    });
  }, []);

  const publishUpsert = useCallback(
    (item: ClipboardInboxItem) => {
      publish({ kind: "upsert", from: deviceFingerprint, item });
    },
    [deviceFingerprint, publish]
  );

  const publishBatch = useCallback(() => {
    const items = getItemsRef.current();
    if (items.length === 0) return;
    publish({ kind: "sync-batch", from: deviceFingerprint, items });
  }, [deviceFingerprint, publish]);

  const requestSync = useCallback(() => {
    publish({ kind: "sync-request", from: deviceFingerprint });
  }, [deviceFingerprint, publish]);

  useEffect(() => {
    if (!enabled || !topic || !deviceFingerprint) return;

    syncRequestedRef.current = false;
    const supabase = createClient();
    const channel = supabase.channel(inboxChannelName(topic));

    channel
      .on(
        "broadcast",
        { event: CLIPBOARD_INBOX_EVENT },
        (payload: { payload: unknown }) => {
          const message = payload.payload;
          if (!isInboxRoomMessage(message)) return;
          if (message.from === deviceFingerprint) return;

          if (message.kind === "sync-request") {
            publishBatch();
            return;
          }

          if (message.kind === "sync-batch") {
            onMergeBatchRef.current(message.items);
            return;
          }

          if (message.kind === "upsert") {
            onUpsertRef.current(message.item);
          }
        }
      )
      .subscribe((state) => {
        if (state !== REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) return;
        channelRef.current = channel;
        if (!syncRequestedRef.current) {
          syncRequestedRef.current = true;
          requestSync();
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      syncRequestedRef.current = false;
    };
  }, [
    deviceFingerprint,
    enabled,
    publishBatch,
    requestSync,
    topic,
  ]);

  return { publishUpsert, requestSync };
}
