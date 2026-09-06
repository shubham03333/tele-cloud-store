import { NextResponse } from "next/server";
import { z } from "zod";
import { getContainer } from "@/lib/di";
import { jsonError, requireApiSession } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    await requireApiSession(request);
    const { id } = z.object({ id: z.string().cuid() }).parse(await params);
    const { fileService } = getContainer();
    return NextResponse.json({ url: fileService.copyLink(id) });
  } catch (error) {
    return jsonError(error);
  }
}
