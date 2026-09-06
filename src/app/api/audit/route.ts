import { NextResponse } from "next/server";
import { getContainer } from "@/lib/di";
import { jsonError, requireApiSession } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { session } = await requireApiSession(request);
    const { audit, loginHistory } = getContainer();
    const [logs, logins, sessions] = await Promise.all([
      audit.recent(30),
      loginHistory.list(session.user.id, 20),
      prisma.session.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    return NextResponse.json({
      logs,
      logins,
      sessions: sessions.map((item) => ({
        id: item.id,
        ipAddress: item.ipAddress,
        userAgent: item.userAgent,
        expiresAt: item.expiresAt,
        createdAt: item.createdAt,
        current: item.token === session.session.token,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { session } = await requireApiSession(request);
    const url = new URL(request.url);
    const id = url.searchParams.get("sessionId");
    if (!id) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }
    const row = await prisma.session.findUnique({ where: { id } });
    if (!row || row.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.session.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
