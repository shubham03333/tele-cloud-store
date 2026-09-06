import { NextResponse } from "next/server";
import { z } from "zod";
import { getContainer } from "@/lib/di";
import { jsonError, requireApiSession } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { session } = await requireApiSession(request);
    const { id } = z.object({ id: z.string().cuid() }).parse(await params);
    const { fileService } = getContainer();
    const file = await fileService.restore(id, session.user.id);
    return NextResponse.json(file);
  } catch (error) {
    return jsonError(error);
  }
}
