import { notFound } from "next/navigation";
import { FilesBrowser } from "@/components/files/files-browser";
import { TopBar } from "@/components/layout/top-bar";
import { getContainer } from "@/lib/di";
import { STORAGE_CATEGORIES } from "@/types";

export default async function CustomCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (STORAGE_CATEGORIES.includes(category as (typeof STORAGE_CATEGORIES)[number])) notFound();

  const customCategories = await getContainer().categories.list();
  if (!customCategories.includes(category)) notFound();

  const title = category.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return (
    <div>
      <TopBar title={title} />
      <FilesBrowser category={category} />
    </div>
  );
}