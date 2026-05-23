"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { isValidMeetCode, meetPath } from "@/lib/meet-code";

/** Legacy route — redirect meet codes to clipboard sync. */
export default function RoomRedirectPage() {
  const params = useParams<{ topic: string }>();
  const router = useRouter();
  const topic = params.topic?.toLowerCase() ?? "";

  useEffect(() => {
    if (!topic) {
      router.replace("/");
      return;
    }
    if (isValidMeetCode(topic)) {
      router.replace(meetPath(topic));
      return;
    }
    router.replace("/");
  }, [router, topic]);

  return (
    <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Redirecting…
    </main>
  );
}
