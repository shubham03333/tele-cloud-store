import { NextResponse } from "next/server";
import { getContainer } from "@/lib/di";
import { jsonError, requireApiSession } from "@/lib/api";
import { categoryCreateSchema } from "@/lib/validations";
import { STORAGE_CATEGORIES } from "@/types";

function toSlug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function GET(request: Request) {
  try {
    await requireApiSession(request);
    const { categories } = getContainer();
    return NextResponse.json({ categories: [...STORAGE_CATEGORIES, ...(await categories.list())] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireApiSession(request);
    const parsed = categoryCreateSchema.parse(await request.json());
    const category = toSlug(parsed.name);
    if (!category || STORAGE_CATEGORIES.includes(category as (typeof STORAGE_CATEGORIES)[number])) {
      return NextResponse.json({ error: "Choose a unique category name" }, { status: 400 });
    }
    const { categories } = getContainer();
    const existing = await categories.list();
    if (existing.includes(category)) {
      return NextResponse.json({ error: "That category already exists" }, { status: 409 });
    }
    await categories.add(category);
    return NextResponse.json({ category });
  } catch (error) {
    return jsonError(error);
  }
}