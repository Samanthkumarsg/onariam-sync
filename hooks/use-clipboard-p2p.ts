"use client";

import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/client";
import {
  CLIPBOARD_SIGNAL_EVENT,
  ICE_SERVERS,
  clipboardChannelName,
  decodeClipboardWireMessage,
  encodeClipboardAck,
  encodeClipboardPayload,
  type ClipboardAck,
  type ClipboardPeerRole,
  type ClipboardPayload,
  type ClipboardSignalMessage,
} from "@/lib/clipboard-p2p";

export type ClipboardConnectionStatus =
  | "idle"
  | "waiting"
  | "connecting"
  | "connected"
  | "failed";

type Options = {
  code: string;
  role: ClipboardPeerRole;
  localId: string;
  enabled?: boolean;
};

export function useClipboardP2p({
  code,
  role,
  localId,
  enabled = true,
}: Options) {
  const [status, setStatus] = useState<ClipboardConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  const makingOfferRef = useRef(false);
  const onReceiveRef = useRef<((payload: ClipboardPayload) => void) | null>(
    null
  );
  const onAckRef = useRef<((ack: ClipboardAck) => void) | null>(null);

  const teardown = useCallback(() => {
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    makingOfferRef.current = false;
  }, []);

  const bindDataChannel = useCallback((dc: RTCDataChannel) => {
    dcRef.current = dc;
    dc.onopen = () => {
      setStatus("connected");
      setError(null);
    };
    dc.onclose = () => {
      if (pcRef.current?.connectionState !== "connected") {
        setStatus((s) => (s === "connected" ? "waiting" : s));
      }
    };
    dc.onerror = () => {
      setError("Data channel error");
      setStatus("failed");
    };
    dc.onmessage = (ev) => {
      if (typeof ev.data !== "string") return;
      const msg = decodeClipboardWireMessage(ev.data);
      if (!msg) return;
      if (msg.type === "text") onReceiveRef.current?.(msg);
      else onAckRef.current?.(msg);
    };
  }, []);

  const ensurePc = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = (ev) => {
      if (!ev.candidate || !channelRef.current) return;
      const msg: ClipboardSignalMessage = {
        from: localId,
        kind: "ice",
        candidate: ev.candidate.toJSON(),
      };
      channelRef.current.send({
        type: "broadcast",
        event: CLIPBOARD_SIGNAL_EVENT,
        payload: msg,
      });
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "connected") setStatus("connected");
      else if (st === "connecting") setStatus("connecting");
      else if (st === "failed" || st === "disconnected") {
        setStatus("failed");
        setError("Connection lost — scan QR again");
        teardown();
      }
    };

    if (role === "desktop") {
      const dc = pc.createDataChannel("clipboard", { ordered: true });
      bindDataChannel(dc);
    } else {
      pc.ondatachannel = (ev) => bindDataChannel(ev.channel);
    }

    return pc;
  }, [bindDataChannel, localId, role, teardown]);

  const postSignal = useCallback((msg: ClipboardSignalMessage) => {
    channelRef.current?.send({
      type: "broadcast",
      event: CLIPBOARD_SIGNAL_EVENT,
      payload: msg,
    });
  }, []);

  const handleSignal = useCallback(
    async (msg: ClipboardSignalMessage) => {
      if (msg.from === localId) return;

      const pc = ensurePc();

      if (msg.kind === "desktop-ready" && role === "mobile") {
        postSignal({ from: localId, kind: "hello" });
        return;
      }

      if (msg.kind === "hello" && role === "desktop") {
        if (makingOfferRef.current || pc.signalingState !== "stable") return;
        makingOfferRef.current = true;
        setStatus("connecting");
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          postSignal({
            from: localId,
            kind: "offer",
            sdp: offer,
          });
        } catch {
          setStatus("failed");
          setError("Could not start peer connection");
          makingOfferRef.current = false;
        }
        return;
      }

      if (msg.kind === "offer" && role === "mobile" && msg.sdp) {
        setStatus("connecting");
        try {
          await pc.setRemoteDescription(msg.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          postSignal({
            from: localId,
            kind: "answer",
            sdp: answer,
          });
        } catch {
          setStatus("failed");
          setError("Could not answer peer connection");
        }
        return;
      }

      if (msg.kind === "answer" && role === "desktop" && msg.sdp) {
        try {
          await pc.setRemoteDescription(msg.sdp);
          makingOfferRef.current = false;
        } catch {
          setStatus("failed");
          setError("Could not complete connection");
          makingOfferRef.current = false;
        }
        return;
      }

      if (msg.kind === "ice" && msg.candidate) {
        try {
          await pc.addIceCandidate(msg.candidate);
        } catch {
          /* ignore stale candidates */
        }
      }
    },
    [ensurePc, localId, postSignal, role]
  );

  const sendText = useCallback((text: string): ClipboardPayload | null => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") {
      setError("Not connected yet");
      return null;
    }
    try {
      const wire = encodeClipboardPayload(trimmed);
      dc.send(wire);
      const payload = JSON.parse(wire) as ClipboardPayload;
      setError(null);
      return payload;
    } catch {
      setError("Could not send");
      return null;
    }
  }, []);

  const sendAck = useCallback((id: string, copied: boolean) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    try {
      dc.send(encodeClipboardAck(id, copied));
    } catch {
      /* ignore */
    }
  }, []);

  const onReceive = useCallback((handler: (payload: ClipboardPayload) => void) => {
    onReceiveRef.current = handler;
  }, []);

  const onAck = useCallback((handler: (ack: ClipboardAck) => void) => {
    onAckRef.current = handler;
  }, []);

  useEffect(() => {
    if (!enabled || !code) return;

    setStatus(role === "desktop" ? "waiting" : "idle");
    setError(null);
    teardown();

    const supabase = createClient();
    const channel = supabase.channel(clipboardChannelName(code));

    channel
      .on(
        "broadcast",
        { event: CLIPBOARD_SIGNAL_EVENT },
        (payload: { payload: ClipboardSignalMessage }) => {
          void handleSignal(payload.payload);
        }
      )
      .subscribe((state) => {
        if (state === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          channelRef.current = channel;
          if (role === "mobile") {
            setStatus("connecting");
            postSignal({ from: localId, kind: "hello" });
          } else {
            postSignal({ from: localId, kind: "desktop-ready" });
          }
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      teardown();
      setStatus("idle");
    };
  }, [
    code,
    enabled,
    handleSignal,
    localId,
    postSignal,
    role,
    teardown,
  ]);

  return { status, error, sendText, sendAck, onReceive, onAck };
}
