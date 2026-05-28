"use client";

import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/client";
import { DEFAULT_ICE_SERVERS, fetchIceServers } from "@/lib/ice-servers";
import {
  CLIPBOARD_SIGNAL_EVENT,
  clipboardChannelName,
  decodeClipboardWireMessage,
  encodeClipboardAck,
  createClipboardPayload,
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

const SIGNAL_RETRY_MS = 3500;
const CONNECT_HINT_MS = 20000;

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
  const seenDesktopReadyRef = useRef(false);
  const iceServersRef = useRef<RTCIceServer[]>(DEFAULT_ICE_SERVERS);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const statusRef = useRef(status);
  statusRef.current = status;
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
    pendingIceRef.current = [];
  }, []);

  const flushPendingIce = useCallback(async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription) return;
    const pending = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        /* stale */
      }
    }
  }, []);

  const addIceCandidateSafe = useCallback(
    async (pc: RTCPeerConnection, candidate: RTCIceCandidateInit) => {
      if (!pc.remoteDescription) {
        pendingIceRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        /* ignore stale candidates */
      }
    },
    []
  );

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

    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current,
    });
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
        setError(
          role === "mobile"
            ? "Could not reach desktop — keep the sync page open on your computer"
            : "Phone connection lost — reopen the send link on your phone"
        );
        teardown();
      }
    };

    /* Phone initiates the offer (better through mobile NAT); desktop receives the channel. */
    if (role === "mobile") {
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

  const startOffer = useCallback(
    async (pc: RTCPeerConnection) => {
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
    },
    [localId, postSignal]
  );

  const pingPeer = useCallback(() => {
    if (!channelRef.current) return;
    if (role === "mobile") {
      if (seenDesktopReadyRef.current && pcRef.current) {
        void startOffer(pcRef.current);
      } else {
        postSignal({ from: localId, kind: "hello" });
      }
    } else {
      postSignal({ from: localId, kind: "desktop-ready" });
    }
  }, [localId, postSignal, role, startOffer]);

  const handleSignal = useCallback(
    async (msg: ClipboardSignalMessage) => {
      if (msg.from === localId) return;

      const pc = ensurePc();

      if (msg.kind === "desktop-ready" && role === "mobile") {
        seenDesktopReadyRef.current = true;
        await startOffer(pc);
        return;
      }

      if (msg.kind === "hello" && role === "desktop") {
        postSignal({ from: localId, kind: "desktop-ready" });
        return;
      }

      if (msg.kind === "offer" && role === "desktop" && msg.sdp) {
        setStatus("connecting");
        try {
          await pc.setRemoteDescription(msg.sdp);
          await flushPendingIce(pc);
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

      if (msg.kind === "answer" && role === "mobile" && msg.sdp) {
        try {
          await pc.setRemoteDescription(msg.sdp);
          await flushPendingIce(pc);
          makingOfferRef.current = false;
        } catch {
          setStatus("failed");
          setError("Could not complete connection");
          makingOfferRef.current = false;
        }
        return;
      }

      if (msg.kind === "ice" && msg.candidate) {
        await addIceCandidateSafe(pc, msg.candidate);
      }
    },
    [
      addIceCandidateSafe,
      ensurePc,
      flushPendingIce,
      localId,
      postSignal,
      role,
      startOffer,
    ]
  );

  const sendPayload = useCallback(
    (
      text: string,
      options?: Parameters<typeof createClipboardPayload>[1]
    ): ClipboardPayload | null => {
      const trimmed = text.trim();
      if (!trimmed) return null;
      const dc = dcRef.current;
      if (!dc || dc.readyState !== "open") {
        setError("Not connected yet");
        return null;
      }
      try {
        const payload = createClipboardPayload(trimmed, options);
        dc.send(JSON.stringify(payload));
        setError(null);
        return payload;
      } catch {
        setError("Could not send");
        return null;
      }
    },
    []
  );

  const sendText = useCallback(
    (text: string, options?: Parameters<typeof createClipboardPayload>[1]) =>
      sendPayload(text, options),
    [sendPayload]
  );

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

    let cancelled = false;

    setStatus(role === "desktop" ? "waiting" : "waiting");
    setError(null);
    teardown();
    seenDesktopReadyRef.current = false;
    iceServersRef.current = DEFAULT_ICE_SERVERS;

    const supabase = createClient();
    const channel = supabase.channel(clipboardChannelName(code));

    void (async () => {
      const servers = await fetchIceServers();
      if (cancelled) return;
      iceServersRef.current = servers;

      channel
        .on(
          "broadcast",
          { event: CLIPBOARD_SIGNAL_EVENT },
          (payload: { payload: ClipboardSignalMessage }) => {
            void handleSignal(payload.payload);
          }
        )
        .subscribe((state) => {
          if (cancelled) return;
          if (state === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
            channelRef.current = channel;
            setStatus("waiting");
            setError(null);
            pingPeer();
          }
        });
    })();

    return () => {
      cancelled = true;
      channel.unsubscribe();
      channelRef.current = null;
      teardown();
      setStatus("idle");
    };
  }, [code, enabled, handleSignal, pingPeer, role, teardown]);

  /** Re-announce while waiting so late joiners (phone or desktop) can pair. */
  useEffect(() => {
    if (!enabled || !code) return;
    const id = setInterval(() => {
      if (statusRef.current === "connected" || statusRef.current === "failed") {
        return;
      }
      pingPeer();
    }, SIGNAL_RETRY_MS);
    return () => clearInterval(id);
  }, [code, enabled, pingPeer]);

  /** Nudge user if desktop sync tab is not open. */
  useEffect(() => {
    if (!enabled || role !== "mobile") return;
    const id = setTimeout(() => {
      if (statusRef.current === "connected" || statusRef.current === "failed") {
        return;
      }
      setError(
        "Open the sync page on your computer (same session code), then wait a moment."
      );
    }, CONNECT_HINT_MS);
    return () => clearTimeout(id);
  }, [code, enabled, role]);

  return { status, error, sendText, sendPayload, sendAck, onReceive, onAck };
}
