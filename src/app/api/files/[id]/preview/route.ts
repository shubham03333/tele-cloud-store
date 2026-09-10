import { NextResponse } from "next/server";
import { z } from "zod";
import { getContainer } from "@/lib/di";
import { jsonError, requireApiSession } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: Request, { params }: Params) {
  try {
    await requireApiSession(request);
    const { id } = z.object({ id: z.string().cuid() }).parse(await params);
    const { fileService } = getContainer();
    const file = await fileService.get(id);
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const rangeHeader = request.headers.get("range");
    const total = Number(file.sizeBytes);
    let start = 0;
    let end = total - 1;
    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
      if (!match) {
        return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
      }
      const suffixLength = Number(match[2] || 0);
      start = match[1] ? Number(match[1]) : Math.max(0, total - suffixLength);
      end = match[1] && match[2] ? Number(match[2]) : Math.min(total - 1, start + 1024 * 1024 - 1);
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= total) {
        return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
      }
      end = Math.min(end, total - 1);
    }

    const { stream } = await fileService.downloadStream(id, rangeHeader ? { start, length: end - start + 1 } : undefined);
    return new NextResponse(stream, {
      status: rangeHeader ? 206 : 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(end - start + 1),
        ...(rangeHeader ? { "Content-Range": `bytes ${start}-${end}/${total}`, "Accept-Ranges": "bytes" } : { "Accept-Ranges": "bytes" }),
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
