import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/origin";

export async function GET(request: Request) {
  const ip = clientIp(request);
  const limit = await consumeRateLimit(`setup:${ip}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const count = await prisma.user.count();
  return NextResponse.json({ needsSetup: count === 0, singleUser: true });
}
