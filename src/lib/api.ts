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
  if (message.includes("AUTH_KEY_DUPLICATED")) {
    return NextResponse.json(
      {
        error:
          "Telegram rejected this session because it is active in another app instance. Stop the other deployment or generate a new string session, then reconnect.",
      },
      { status: 503 },
    );
  }
  const status = message === "Unauthorized" ? 401 : 500;
  return NextResponse.json({ error: message }, { status });
}
