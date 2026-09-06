import { TopBar } from "@/components/layout/top-bar";
import { FilesBrowser } from "@/components/files/files-browser";

export default function MusicPage() {
  return (
    <div>
      <TopBar title="Music" />
      <FilesBrowser category="music" />
    </div>
  );
}
