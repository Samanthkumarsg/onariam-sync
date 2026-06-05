import { MemoryBlockstore } from "blockstore-core";
import { exporter } from "ipfs-unixfs-exporter";
import { importFile } from "ipfs-unixfs-importer";
import { CID } from "multiformats/cid";

import type { IpfsFileMeta } from "@/lib/ipfs-types";

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
  return { cid: cidStr, ...meta };
}

export async function readFileFromIpfs(cidStr: string): Promise<{
  bytes: Uint8Array;
  meta: StoredFileMeta | null;
}> {
  const store = blockstore();
  const cid = CID.parse(cidStr);
  const entry = await exporter(cid, store);
  if (entry.type !== "file") {
    throw new Error("not a file");
  }

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
}

export function getIpfsFileMeta(cidStr: string): StoredFileMeta | null {
  return metaStore().get(cidStr) ?? null;
}
