import { NextResponse } from "next/server";
import { z } from "zod";
import { getContainer } from "@/lib/di";
import { jsonError, requireApiSession } from "@/lib/api";
import { uploadInitSchema } from "@/lib/validations";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const { session, ip } = await requireApiSession(request);
    const limited = await consumeRateLimit(`upload:${session.user.id}`, 40);
    if (!limited.allowed) {
      return NextResponse.json({ error: "Too many uploads" }, { status: 429 });
    }
    const body = uploadInitSchema.parse(await request.json());
    const { fileService } = getContainer();
    const created = await fileService.initUpload({
      ...body,
      userId: session.user.id,
      ipAddress: ip,
    });
    return NextResponse.json({
      sessionId: created.id,
      chunkSize: created.chunkSize,
      category: created.category,
    });
  } catch (error) {
    return jsonError(error);
  }
}

const idSchema = z.object({ sessionId: z.string().cuid() });

export async function PATCH(request: Request) {
  try {
    await requireApiSession(request);
    const body = z
      .object({ sessionId: z.string().cuid(), action: z.enum(["pause", "resume", "cancel"]) })
      .parse(await request.json());
    const { fileService } = getContainer();
    if (body.action === "pause") {
      await fileService.pause(body.sessionId);
    } else if (body.action === "resume") {
      await fileService.resume(body.sessionId);
    } else {
      await fileService.cancel(body.sessionId);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export { idSchema };
