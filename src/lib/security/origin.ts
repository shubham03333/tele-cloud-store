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

  const allowedOrigins = new Set([
    getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, ""),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : []),
  ]);
  const originUrl = new URL(origin);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = forwardedHost ?? request.headers.get("host");
  const sameRequestHost = requestHost !== null && originUrl.host === requestHost;
  if (!sameRequestHost && !allowedOrigins.has(origin.replace(/\/$/, ""))) {
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
