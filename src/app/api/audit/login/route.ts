import { NextResponse } from "next/server";
import { getContainer } from "@/lib/di";
import { jsonError, requireApiSession } from "@/lib/api";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const { session, ip, userAgent } = await requireApiSession(request);
    const limited = await consumeRateLimit(`login-history:${ip}`, 20, 60_000);
    if (!limited.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const { loginHistory } = getContainer();
    await loginHistory.record({
      userId: session.user.id,
      ipAddress: ip,
      userAgent,
      success: true,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
