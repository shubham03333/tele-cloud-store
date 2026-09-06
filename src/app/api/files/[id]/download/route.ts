import { NextResponse } from "next/server";
import { z } from "zod";
import { getContainer } from "@/lib/di";
import { jsonError, requireApiSession } from "@/lib/api";
import { sanitizeFilename } from "@/lib/security/sanitize";

export const runtime = "nodejs";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const url = new URL(request.url);
    const sig = url.searchParams.get("sig");
    const exp = url.searchParams.get("exp");
    const { id } = z.object({ id: z.string().cuid() }).parse(await params);
    const { fileService } = getContainer();

    if (sig && exp) {
      if (!fileService.verifyLink(id, exp, sig)) {
        return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
      }
    } else {
      await requireApiSession(request);
    }

    const { file, stream } = await fileService.downloadStream(id);
    return new NextResponse(stream, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${sanitizeFilename(file.filename)}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
