import { NextResponse } from "next/server";
import { getContainer } from "@/lib/di";
import { jsonError, requireApiSession } from "@/lib/api";
import { folderCreateSchema } from "@/lib/validations";
import { sanitizeFilename } from "@/lib/security/sanitize";
import { z } from "zod";
import { STORAGE_CATEGORIES } from "@/types";

export async function GET(request: Request) {
  try {
    await requireApiSession(request);
    const url = new URL(request.url);
    const category = z.enum(STORAGE_CATEGORIES).parse(url.searchParams.get("category") ?? "files");
    const parentId = url.searchParams.get("parentId");
    const { folders } = getContainer();
    const items = await folders.list(category, parentId ? parentId : null);
    return NextResponse.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireApiSession(request);
    const parsed = folderCreateSchema.parse(await request.json());
    const { folders } = getContainer();
    const folder = await folders.create({
      name: sanitizeFilename(parsed.name),
      category: parsed.category,
      parent: parsed.parentId ? { connect: { id: parsed.parentId } } : undefined,
    });
    return NextResponse.json(folder);
  } catch (error) {
    return jsonError(error);
  }
}
