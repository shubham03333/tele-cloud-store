import { TopBar } from "@/components/layout/top-bar";
import { FilesBrowser } from "@/components/files/files-browser";

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return (
    <div>
      <TopBar title="Files" />
      <FilesBrowser q={q} />
    </div>
  );
}
