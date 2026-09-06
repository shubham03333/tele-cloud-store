import "server-only";

import { getEnv, isProduction } from "@/lib/env";

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) {
    if (request.method === "GET" || request.method === "HEAD") {
      return;
    }
    if (!isProduction()) {
      return;
    }
    throw new Error("Missing Origin header");
  }

  const allowed = getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (origin.replace(/\/$/, "") !== allowed) {
    throw new Error("Invalid origin");
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function userAgent(request: Request): string {
  return request.headers.get("user-agent")?.slice(0, 512) ?? "unknown";
}
