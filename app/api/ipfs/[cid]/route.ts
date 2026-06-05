import { readFileFromIpfs } from "@/lib/ipfs-server";

export const runtime = "nodejs";

type Params = { params: Promise<{ cid: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { cid } = await params;

  try {
    const { bytes, meta } = await readFileFromIpfs(cid);
    const mimeType = meta?.mimeType ?? "application/octet-stream";
    const name = meta?.name ?? "file";

    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(name)}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return Response.json({ error: "file not found" }, { status: 404 });
  }
}
