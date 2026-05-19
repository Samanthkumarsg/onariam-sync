"use client";

import { Cursor } from "@/components/cursor";
import { useRealtimeCursors } from "@/hooks/use-realtime-cursors";

const THROTTLE_MS = 50;

export const RealtimeCursors = ({
  roomName,
  username,
  userId,
  avatar,
}: {
  roomName: string;
  username: string;
  userId: string;
  avatar: string;
}) => {
  const { cursors } = useRealtimeCursors({
    roomName,
    username,
    userId,
    avatar,
    throttleMs: THROTTLE_MS,
  });

  const cursorStyle = (x: number, y: number) => ({
    transitionDuration: "20ms",
    top: 0,
    left: 0,
    transform: `translate(${x}px, ${y}px)`,
  });

  return (
    <>
      {Object.keys(cursors).map((id) => (
        <Cursor
          key={id}
          className="fixed z-50 transition-transform ease-in-out"
          style={cursorStyle(cursors[id].position.x, cursors[id].position.y)}
          color={cursors[id].color}
          name={cursors[id].user.name}
          avatar={cursors[id].avatar ?? "🦊"}
        />
      ))}
    </>
  );
};
