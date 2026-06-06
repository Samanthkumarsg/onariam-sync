import { MemoryBlockstore } from "blockstore-core";
import { exporter } from "ipfs-unixfs-exporter";
import { importFile } from "ipfs-unixfs-importer";
import { CID } from "multiformats/cid";

import type { IpfsFileMeta } from "@/lib/ipfs-types";
import { loadIpfsFile, persistIpfsFile } from "@/lib/ipfs-store";

type StoredFileMeta = Pick<IpfsFileMeta, "name" | "mimeType" | "size">;

declare global {
  var __onariamIpfsBlockstore: MemoryBlockstore | undefined;
  var __onariamIpfsMeta: Map<string, StoredFileMeta> | undefined;
}

function blockstore(): MemoryBlockstore {
  if (!globalThis.__onariamIpfsBlockstore) {
    globalThis.__onariamIpfsBlockstore = new MemoryBlockstore();
  }
  return globalThis.__onariamIpfsBlockstore;
}

function metaStore(): Map<string, StoredFileMeta> {
  if (!globalThis.__onariamIpfsMeta) {
    globalThis.__onariamIpfsMeta = new Map();
  }
  return globalThis.__onariamIpfsMeta;
}

async function readFromMemoryBlockstore(cidStr: string): Promise<{
  bytes: Uint8Array;
  meta: StoredFileMeta | null;
} | null> {
  const store = blockstore();
  try {
    const cid = CID.parse(cidStr);
    const entry = await exporter(cid, store);
    if (entry.type !== "file") return null;

    const chunks: Uint8Array[] = [];
    for await (const chunk of entry.content()) {
      chunks.push(chunk);
    }

    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }

    return { bytes, meta: metaStore().get(cidStr) ?? null };
  } catch {
    return null;
  }
}

export async function addFileToIpfs(
  bytes: Uint8Array,
  meta: StoredFileMeta
): Promise<IpfsFileMeta> {
  const store = blockstore();
  const entry = await importFile(
    { path: meta.name, content: bytes },
    store,
    { cidVersion: 1 }
  );
  const cid = entry.cid;
  if (!cid) throw new Error("ipfs import failed");

  const cidStr = cid.toString();
  metaStore().set(cidStr, meta);
  await persistIpfsFile(cidStr, bytes, meta);
  return { cid: cidStr, ...meta };
}

export async function readFileFromIpfs(cidStr: string): Promise<{
  bytes: Uint8Array;
  meta: StoredFileMeta | null;
}> {
  const persisted = await loadIpfsFile(cidStr);
  if (persisted) {
    if (persisted.meta) metaStore().set(cidStr, persisted.meta);
    return persisted;
  }

  const fromMemory = await readFromMemoryBlockstore(cidStr);
  if (fromMemory) {
    if (fromMemory.meta) {
      await persistIpfsFile(cidStr, fromMemory.bytes, fromMemory.meta);
    }
    return fromMemory;
  }

  throw new Error("file not found");
}

export function getIpfsFileMeta(cidStr: string): StoredFileMeta | null {
  return metaStore().get(cidStr) ?? null;
}
