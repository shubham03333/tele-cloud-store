import { NextResponse } from "next/server";
import { z } from "zod";
import { getContainer } from "@/lib/di";
import { jsonError, requireApiSession } from "@/lib/api";
import { moveSchema, renameSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireApiSession(request);
    const { id } = z.object({ id: z.string().cuid() }).parse(await params);
    const { fileService } = getContainer();
    const file = await fileService.get(id);
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(file);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { session } = await requireApiSession(request);
    const { id } = await params;
    const body = z
      .object({
        filename: z.string().min(1).max(180).optional(),
        folderId: z.string().cuid().nullable().optional(),
        favorite: z.boolean().optional(),
        pinned: z.boolean().optional(),
      })
      .parse(await request.json());
    const { fileService } = getContainer();
    let file = await fileService.get(id);
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (body.filename) {
      renameSchema.parse({ id, filename: body.filename });
      file = await fileService.rename(id, body.filename, session.user.id);
    }
    if (body.folderId !== undefined) {
      moveSchema.parse({ id, folderId: body.folderId });
      file = await fileService.move(id, body.folderId, session.user.id);
    }
    if (body.favorite !== undefined) {
      file = await fileService.setFavorite(id, body.favorite, session.user.id);
    }
    if (body.pinned !== undefined) {
      file = await fileService.setPinned(id, body.pinned);
    }
    return NextResponse.json(file);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { session } = await requireApiSession(request);
    const { id } = z.object({ id: z.string().cuid() }).parse(await params);
    const url = new URL(request.url);
    const { fileService } = getContainer();
    if (url.searchParams.get("purge") === "true") {
      await fileService.purge(id, session.user.id);
      return NextResponse.json({ ok: true });
    }
    const file = await fileService.trash(id, session.user.id);
    return NextResponse.json(file);
  } catch (error) {
    return jsonError(error);
  }
}
