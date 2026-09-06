import "server-only";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assertSameOrigin, clientIp, userAgent } from "@/lib/security/origin";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireApiSession(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    assertSameOrigin(request);
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw new HttpError(401, "Unauthorized");
  }

  return {
    session,
    ip: clientIp(request),
    userAgent: userAgent(request),
  };
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status = message === "Unauthorized" ? 401 : 400;
  return NextResponse.json({ error: message }, { status });
}
