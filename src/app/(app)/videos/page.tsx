import { TopBar } from "@/components/layout/top-bar";
import { FilesBrowser } from "@/components/files/files-browser";

export default function VideosPage() {
  return (
    <div>
      <TopBar title="Videos" />
      <FilesBrowser category="videos" />
    </div>
  );
}
