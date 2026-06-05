import { MAX_IPFS_FILE_BYTES, type IpfsFileMeta } from "@/lib/ipfs-types";

export { MAX_IPFS_FILE_BYTES, type IpfsFileMeta };

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileBoardLabel(name: string): string {
  return `📎 ${name}`;
}

/** Download URL — app gateway by default; override with NEXT_PUBLIC_IPFS_GATEWAY. */
export function ipfsDownloadUrl(cid: string): string {
  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY?.replace(/\/$/, "");
  if (gateway) return `${gateway}/${cid}`;
  return `/api/ipfs/${cid}`;
}

export async function uploadFileToIpfs(file: File): Promise<IpfsFileMeta> {
  if (file.size > MAX_IPFS_FILE_BYTES) {
    throw new Error(`File must be under ${formatFileSize(MAX_IPFS_FILE_BYTES)}`);
  }

  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/ipfs", { method: "POST", body: form });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Upload failed");
  }

  return (await res.json()) as IpfsFileMeta;
}

export async function downloadIpfsFile(cid: string, name: string): Promise<void> {
  const res = await fetch(ipfsDownloadUrl(cid));
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
