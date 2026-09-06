import { TopBar } from "@/components/layout/top-bar";
import { FilesBrowser } from "@/components/files/files-browser";

export default function ArchivesPage() {
  return (
    <div>
      <TopBar title="Archives" />
      <FilesBrowser category="archives" />
    </div>
  );
}
