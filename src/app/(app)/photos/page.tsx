import { TopBar } from "@/components/layout/top-bar";
import { FilesBrowser } from "@/components/files/files-browser";

export default function PhotosPage() {
  return (
    <div>
      <TopBar title="Photos" />
      <FilesBrowser category="photos" />
    </div>
  );
}
