import { readFileFromIpfs } from "@/lib/ipfs-server";

export const runtime = "nodejs";

type Params = { params: Promise<{ cid: string }> };

export async function GET(request: Request, { params }: Params) {
  const { cid } = await params;
  const download = new URL(request.url).searchParams.get("download") === "1";

  try {
    const { bytes, meta } = await readFileFromIpfs(cid);
    const mimeType = meta?.mimeType ?? "application/octet-stream";
    const name = meta?.name ?? "file";
    const disposition = download ? "attachment" : "inline";

    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(name)}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return Response.json({ error: "file not found" }, { status: 404 });
  }
}
