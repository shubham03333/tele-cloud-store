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
    const { file, buffer } = await fileService.previewBuffer(id);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": file.mimeType,
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
