import { NextResponse } from "next/server";
import { z } from "zod";
import { getContainer } from "@/lib/di";
import { jsonError, requireApiSession } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const { session, ip } = await requireApiSession(request);
    const body = z.object({ sessionId: z.string().cuid() }).parse(await request.json());
    const { fileService } = getContainer();
    const file = await fileService.completeUpload(body.sessionId, session.user.id, ip);
    return NextResponse.json(file);
  } catch (error) {
    return jsonError(error);
  }
}
