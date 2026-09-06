import type { StorageCategory } from "@/types";

export const CATEGORY_MIME_MAP: Record<StorageCategory, string[]> = {
  photos: ["image/"],
  videos: ["video/"],
  movies: ["video/"],
  music: ["audio/"],
  documents: [
    "application/pdf",
    "application/msword",
    "application/vnd",
    "text/",
  ],
  archives: [
    "application/zip",
    "application/x-zip",
    "application/x-rar",
    "application/x-7z",
    "application/gzip",
    "application/x-tar",
  ],
  files: [],
};

const MOVIE_HINTS = [".mkv", ".avi", ".mov", ".mp4", ".m4v", ".webm"];

export function inferCategory(mimeType: string, filename: string): StorageCategory {
  const lowerName = filename.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerMime.startsWith("image/")) {
    return "photos";
  }

  if (lowerMime.startsWith("audio/")) {
    return "music";
  }

  if (lowerMime.startsWith("video/")) {
    const looksLikeMovie = MOVIE_HINTS.some((ext) => lowerName.endsWith(ext)) && lowerName.includes(".");
    if (lowerName.match(/\b(s\d{2}e\d{2}|1080p|2160p|bluray|webrip)\b/i)) {
      return "movies";
    }
    if (looksLikeMovie && (lowerName.includes("movie") || lowerName.length > 40)) {
      return "movies";
    }
    return "videos";
  }

  if (CATEGORY_MIME_MAP.archives.some((prefix) => lowerMime.startsWith(prefix) || lowerMime.includes("compressed"))) {
    return "archives";
  }

  if (
    lowerName.endsWith(".zip") ||
    lowerName.endsWith(".rar") ||
    lowerName.endsWith(".7z") ||
    lowerName.endsWith(".tar") ||
    lowerName.endsWith(".gz")
  ) {
    return "archives";
  }

  if (
    CATEGORY_MIME_MAP.documents.some((prefix) => lowerMime.startsWith(prefix)) ||
    /\.(pdf|docx?|xlsx?|pptx?|txt|md|rtf|csv)$/i.test(lowerName)
  ) {
    return "documents";
  }

  return "files";
}

export const CATEGORY_LABELS: Record<StorageCategory, string> = {
  files: "Files",
  photos: "Photos",
  videos: "Videos",
  movies: "Movies",
  music: "Music",
  documents: "Documents",
  archives: "Archives",
};
