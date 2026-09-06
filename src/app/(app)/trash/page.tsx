import { TopBar } from "@/components/layout/top-bar";
import { FilesBrowser } from "@/components/files/files-browser";

export default function TrashPage() {
  return (
    <div>
      <TopBar title="Trash" />
      <FilesBrowser deleted />
    </div>
  );
}
