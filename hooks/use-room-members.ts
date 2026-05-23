import { useCallback, useEffect, useMemo, useState } from "react";

import {
  approveMember,
  getRoomMembers,
  rejectMember,
  type RoomMember,
} from "@/lib/meetings";

function sortMembers(
  members: RoomMember[],
  currentDeviceFingerprint: string
): RoomMember[] {
  return [...members].sort((a, b) => {
    const aYou = a.device_fingerprint === currentDeviceFingerprint;
    const bYou = b.device_fingerprint === currentDeviceFingerprint;
    if (aYou !== bYou) return aYou ? -1 : 1;
    const statusOrder = { pending: 0, approved: 1, rejected: 2 };
    const sa = statusOrder[a.status] ?? 9;
    const sb = statusOrder[b.status] ?? 9;
    if (sa !== sb) return sa - sb;
    return a.display_name.localeCompare(b.display_name, undefined, {
      sensitivity: "base",
    });
  });
}

export function useRoomMembers(
  topic: string,
  deviceFingerprint: string,
  currentDeviceFingerprint: string,
  isHost: boolean,
  enabled = true
) {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled || !topic || !deviceFingerprint) return;
    try {
      const data = await getRoomMembers(topic, deviceFingerprint);
      setMembers(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load participants");
    } finally {
      setLoading(false);
    }
  }, [topic, deviceFingerprint, enabled]);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    void load();
    const id = setInterval(() => void load(), 3000);
    return () => clearInterval(id);
  }, [load, enabled]);

  const sortedMembers = useMemo(
    () => sortMembers(members, currentDeviceFingerprint),
    [members, currentDeviceFingerprint]
  );

  const pendingMembers = useMemo(
    () => members.filter((m) => m.status === "pending"),
    [members]
  );

  const approvedCount = useMemo(
    () => members.filter((m) => m.status === "approved").length,
    [members]
  );

  const approve = useCallback(
    async (memberFingerprint: string) => {
      if (!isHost) return;
      await approveMember(topic, deviceFingerprint, memberFingerprint);
      await load();
    },
    [isHost, topic, deviceFingerprint, load]
  );

  const reject = useCallback(
    async (memberFingerprint: string) => {
      if (!isHost) return;
      await rejectMember(topic, deviceFingerprint, memberFingerprint);
      await load();
    },
    [isHost, topic, deviceFingerprint, load]
  );

  return {
    members,
    sortedMembers,
    pendingMembers,
    approvedCount,
    count: members.length,
    loading,
    error,
    refresh: load,
    approve,
    reject,
  };
}
