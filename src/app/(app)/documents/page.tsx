import { TopBar } from "@/components/layout/top-bar";
import { FilesBrowser } from "@/components/files/files-browser";

export default function DocumentsPage() {
  return (
    <div>
      <TopBar title="Documents" />
      <FilesBrowser category="documents" />
    </div>
  );
}
