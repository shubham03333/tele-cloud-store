import { NextResponse } from "next/server";
import { z } from "zod";
import { getContainer } from "@/lib/di";
import { jsonError, requireApiSession } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function PUT(request: Request) {
  try {
    await requireApiSession(request);
    const url = new URL(request.url);
    const sessionId = z.string().cuid().parse(url.searchParams.get("sessionId"));
    const chunkIndex = z.coerce.number().int().min(0).parse(url.searchParams.get("chunkIndex"));
    const buffer = Buffer.from(await request.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Invalid chunk size" }, { status: 400 });
    }
    const { fileService } = getContainer();
    const result = await fileService.appendChunk(sessionId, chunkIndex, buffer);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
