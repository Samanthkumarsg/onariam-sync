import { addFileToIpfs } from "@/lib/ipfs-server";
import { MAX_IPFS_FILE_BYTES } from "@/lib/ipfs-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "file required" }, { status: 400 });
    }

    if (file.size > MAX_IPFS_FILE_BYTES) {
      return Response.json({ error: "file too large" }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const meta = await addFileToIpfs(bytes, {
      name: file.name || "file",
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    });

    return Response.json(meta);
  } catch {
    return Response.json({ error: "ipfs upload failed" }, { status: 500 });
  }
}
