"use client";

import { useEffect, useState } from "react";

import { getDeviceId } from "@/lib/device-id";

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getDeviceId()
      .then((id) => {
        if (!cancelled) {
          setDeviceId(id);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to read device id");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { deviceId, error, ready: deviceId !== null || error !== null };
}
