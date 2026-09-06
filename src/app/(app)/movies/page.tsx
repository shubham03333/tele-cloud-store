import { TopBar } from "@/components/layout/top-bar";
import { FilesBrowser } from "@/components/files/files-browser";

export default function MoviesPage() {
  return (
    <div>
      <TopBar title="Movies" />
      <FilesBrowser category="movies" />
    </div>
  );
}
