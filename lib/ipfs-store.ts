import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { IpfsFileMeta } from "@/lib/ipfs-types";

const BUCKET = "session-files";

type StoredFileMeta = Pick<IpfsFileMeta, "name" | "mimeType" | "size">;

type MetaRecord = StoredFileMeta & { cid: string };

function storageClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function dataDir(): string {
  return path.join(process.cwd(), ".data", "ipfs");
}

function bytesPath(cid: string): string {
  return path.join(dataDir(), `${cid}.bin`);
}

function metaPath(cid: string): string {
  return path.join(dataDir(), `${cid}.meta.json`);
}

async function writeDisk(cid: string, bytes: Uint8Array, meta: StoredFileMeta) {
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  await writeFile(bytesPath(cid), bytes);
  await writeFile(
    metaPath(cid),
    JSON.stringify({ cid, ...meta } satisfies MetaRecord)
  );
}

async function readMetaSidecar(cid: string): Promise<StoredFileMeta | null> {
  try {
    const raw = await readFile(metaPath(cid), "utf8");
    const parsed = JSON.parse(raw) as MetaRecord;
    return {
      name: parsed.name,
      mimeType: parsed.mimeType,
      size: parsed.size,
    };
  } catch {
    return null;
  }
}

async function readDisk(
  cid: string
): Promise<{ bytes: Uint8Array; meta: StoredFileMeta | null } | null> {
  try {
    const bytes = new Uint8Array(await readFile(bytesPath(cid)));
    const meta = await readMetaSidecar(cid);
    return { bytes, meta };
  } catch {
    return null;
  }
}

async function writeSupabase(
  cid: string,
  bytes: Uint8Array,
  meta: StoredFileMeta
): Promise<boolean> {
  const supabase = storageClient();
  if (!supabase) return false;

  const { error } = await supabase.storage.from(BUCKET).upload(cid, bytes, {
    contentType: meta.mimeType || "application/octet-stream",
    upsert: true,
    metadata: {
      name: meta.name,
      mimeType: meta.mimeType,
      size: String(meta.size),
    },
  });

  return !error;
}

async function readSupabase(
  cid: string
): Promise<{ bytes: Uint8Array; meta: StoredFileMeta | null } | null> {
  const supabase = storageClient();
  if (!supabase) return null;

  const { data, error } = await supabase.storage.from(BUCKET).download(cid);
  if (error || !data) return null;

  const bytes = new Uint8Array(await data.arrayBuffer());
  const sidecarMeta = await readMetaSidecar(cid);

  return {
    bytes,
    meta: sidecarMeta ?? {
      name: "file",
      mimeType: data.type || "application/octet-stream",
      size: bytes.length,
    },
  };
}

export async function persistIpfsFile(
  cid: string,
  bytes: Uint8Array,
  meta: StoredFileMeta
): Promise<void> {
  await writeDisk(cid, bytes, meta);
  await writeSupabase(cid, bytes, meta);
}

export async function loadIpfsFile(
  cid: string
): Promise<{ bytes: Uint8Array; meta: StoredFileMeta | null } | null> {
  const fromSupabase = await readSupabase(cid);
  if (fromSupabase) return fromSupabase;

  return readDisk(cid);
}
