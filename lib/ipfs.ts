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
export function ipfsDownloadUrl(cid: string, download = false): string {
  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY?.replace(/\/$/, "");
  const base = gateway ? `${gateway}/${cid}` : `/api/ipfs/${cid}`;
  if (!download || gateway) return base;
  return `${base}?download=1`;
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

/** Trigger a browser file save. Uses octet-stream for HTML/text so `download` is honoured. */
export async function downloadIpfsFile(
  cid: string,
  name: string,
  mimeType?: string
): Promise<void> {
  const res = await fetch(ipfsDownloadUrl(cid, true));
  if (!res.ok) {
    throw new Error(
      res.status === 404 ? "File not found — try re-uploading" : "Download failed"
    );
  }

  const buffer = await res.arrayBuffer();
  const forceAttachment =
    !mimeType ||
    mimeType.startsWith("text/html") ||
    mimeType.startsWith("text/plain");
  const blob = new Blob([buffer], {
    type: forceAttachment ? "application/octet-stream" : mimeType,
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
