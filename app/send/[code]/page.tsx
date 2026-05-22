"use client";

import { useParams } from "next/navigation";

import { ClipboardSender } from "@/components/clipboard-sender";

export default function SendPage() {
  const params = useParams<{ code: string }>();
  return <ClipboardSender code={params.code ?? ""} />;
}
