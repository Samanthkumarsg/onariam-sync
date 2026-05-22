import { useEffect, useMemo, useState } from "react";

import type { RoomMember } from "@/lib/rooms";
import { getRoomMembers } from "@/lib/rooms";

function sortMembers(
  members: RoomMember[],
  currentDeviceFingerprint: string
): RoomMember[] {
  return [...members].sort((a, b) => {
    const aYou = a.device_fingerprint === currentDeviceFingerprint;
    const bYou = b.device_fingerprint === currentDeviceFingerprint;
    if (aYou !== bYou) return aYou ? -1 : 1;
    return a.display_name.localeCompare(b.display_name, undefined, {
      sensitivity: "base",
    });
  });
}

export function useRoomMembers(
  topic: string,
  deviceFingerprint: string,
  currentDeviceFingerprint: string
) {
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

  const sortedMembers = useMemo(
    () => sortMembers(members, currentDeviceFingerprint),
    [members, currentDeviceFingerprint]
  );

  return { members, sortedMembers, count: members.length };
}
