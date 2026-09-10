import { NextResponse } from "next/server";
import { getContainer } from "@/lib/di";
import { jsonError, requireApiSession } from "@/lib/api";
import { channelBindSchema, telegramSessionSchema } from "@/lib/validations";
import { STORAGE_CATEGORIES } from "@/types";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  try {
    await requireApiSession(request);
    const { telegram } = getContainer();
    return NextResponse.json(await telegram.status());
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, ip } = await requireApiSession(request);
    const limited = await consumeRateLimit(`telegram:${session.user.id}`, 8);
    if (!limited.allowed) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }
    const body = await request.json();
    const { telegram, audit, fileService } = getContainer();

    if (body.action === "session") {
      const parsed = telegramSessionSchema.parse(body);
      await telegram.saveStringSession(parsed.stringSession);
      await telegram.connect();
      await audit.write({
        userId: session.user.id,
        action: "telegram.session.save",
        ipAddress: ip,
      });
      return NextResponse.json(await telegram.status());
    }

    if (body.action === "connect") {
      await telegram.connect();
      return NextResponse.json(await telegram.status());
    }

    if (body.action === "bind") {
      const parsed = channelBindSchema.parse(body);
      const customCategories = await getContainer().categories.list();
      if (!STORAGE_CATEGORIES.includes(parsed.category as (typeof STORAGE_CATEGORIES)[number]) && !customCategories.includes(parsed.category)) {
        return NextResponse.json({ error: "Add this library before binding a channel" }, { status: 400 });
      }
      await telegram.bindChannel(parsed.category, parsed.peer);
      await audit.write({
        userId: session.user.id,
        action: "telegram.channel.bind",
        metadata: { category: parsed.category },
        ipAddress: ip,
      });
      return NextResponse.json(await telegram.status());
    }

    if (body.action === "sync") {
      if (typeof body.category !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.category)) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      const result = await fileService.syncTelegramChannel(body.category, session.user.id, ip);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}
