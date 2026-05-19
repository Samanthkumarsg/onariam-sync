"use client";

import { useEffect, useState } from "react";

import type { RoomMember } from "@/lib/rooms";
import { getRoomMembers } from "@/lib/rooms";
import { label, panel } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  topic: string;
  deviceFingerprint: string;
  currentDeviceFingerprint: string;
};

export function RoomMembersPanel({
  topic,
  deviceFingerprint,
  currentDeviceFingerprint,
}: Props) {
  const [members, setMembers] = useState<RoomMember[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = () =>
      getRoomMembers(topic, deviceFingerprint)
        .then((data) => {
          if (!cancelled) setMembers(data);
        })
        .catch(() => {});

    load();
    const id = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [topic, deviceFingerprint]);

  if (members.length === 0) return null;

  return (
    <aside
      className={cn(
        panel,
        "pointer-events-auto fixed right-4 top-4 z-40 w-48 cursor-auto py-3"
      )}
    >
      <p className={cn(label, "mb-2 text-xs uppercase tracking-wide")}>
        {members.length} in room
      </p>
      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.device_fingerprint}
            className="flex items-center gap-2 text-sm text-foreground"
          >
            <span className="text-base leading-none">{m.avatar ?? "🦊"}</span>
            <span className="truncate">
              {m.display_name}
              {m.device_fingerprint === currentDeviceFingerprint && (
                <span className="text-muted-foreground"> · you</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
