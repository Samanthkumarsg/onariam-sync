"use client";

import { type RefObject, useEffect } from "react";

import { Cursor } from "@/components/cursor";
import { useRealtimeCursors } from "@/hooks/use-realtime-cursors";

const THROTTLE_MS = 50;
const IFRAME_CURSOR_MESSAGE = "onariam-sync-cursor";

type Props = {
  roomName: string;
  username: string;
  userId: string;
  avatar: string;
  /** When set, cursor position is synced from inside this proxied iframe. */
  iframeRef?: RefObject<HTMLIFrameElement | null>;
};

export const RealtimeCursors = ({
  roomName,
  username,
  userId,
  avatar,
  iframeRef,
}: Props) => {
  const { cursors, localCursor, color, reportPosition } = useRealtimeCursors({
    roomName,
    username,
    userId,
    avatar,
    throttleMs: THROTTLE_MS,
  });

  useEffect(() => {
    if (!iframeRef) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== IFRAME_CURSOR_MESSAGE) return;
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow || event.source !== iframe.contentWindow) {
        return;
      }

      const rect = iframe.getBoundingClientRect();
      reportPosition(
        rect.left + Number(event.data.x),
        rect.top + Number(event.data.y)
      );
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [iframeRef, reportPosition]);

  const cursorStyle = (x: number, y: number, isSelf = false) => ({
    transitionDuration: isSelf ? "0ms" : "20ms",
    top: 0,
    left: 0,
    transform: `translate(${x}px, ${y}px)`,
  });

  return (
    <>
      {localCursor && (
        <Cursor
          className="fixed z-[60] pointer-events-none"
          style={cursorStyle(
            localCursor.position.x,
            localCursor.position.y,
            true
          )}
          color={color}
          name={username}
          avatar={avatar}
          isSelf
        />
      )}
      {Object.keys(cursors).map((id) => (
        <Cursor
          key={id}
          className="fixed z-50 pointer-events-none transition-transform ease-in-out"
          style={cursorStyle(cursors[id].position.x, cursors[id].position.y)}
          color={cursors[id].color}
          name={cursors[id].user.name}
          avatar={cursors[id].avatar ?? "🦊"}
        />
      ))}
    </>
  );
};
