import { NextResponse } from "next/server";
import { getContainer } from "@/lib/di";
import { jsonError, requireApiSession } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await requireApiSession(request);
    const { fileService } = getContainer();
    const [stats, recent, pinned] = await Promise.all([
      fileService.stats(),
      fileService.recent(),
      fileService.pinned(),
    ]);
    return NextResponse.json({ stats, recent, pinned });
  } catch (error) {
    return jsonError(error);
  }
}
