import { NextResponse } from "next/server";
import { paginationSchema } from "@/lib/validations";
import { getContainer } from "@/lib/di";
import { jsonError, requireApiSession } from "@/lib/api";
import { sanitizeSearchQuery } from "@/lib/security/sanitize";

export async function GET(request: Request) {
  try {
    await requireApiSession(request);
    const url = new URL(request.url);
    const parsed = paginationSchema.parse(Object.fromEntries(url.searchParams));
    const { fileService } = getContainer();
    const result = await fileService.list({
      ...parsed,
      q: parsed.q ? sanitizeSearchQuery(parsed.q) : undefined,
      folderId: parsed.folderId === undefined ? undefined : parsed.folderId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
