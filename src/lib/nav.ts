import {
  Archive,
  FileText,
  Film,
  Folder,
  Heart,
  Home,
  ImageIcon,
  Music,
  Settings,
  Trash2,
  Video,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", shortLabel: "Home", icon: Home },
  { href: "/files", label: "Files", shortLabel: "Files", icon: Folder },
  { href: "/photos", label: "Photos", shortLabel: "Photos", icon: ImageIcon },
  { href: "/videos", label: "Videos", shortLabel: "Videos", icon: Video },
  { href: "/movies", label: "Movies", shortLabel: "Movies", icon: Film },
  { href: "/music", label: "Music", shortLabel: "Music", icon: Music },
  { href: "/documents", label: "Documents", shortLabel: "Docs", icon: FileText },
  { href: "/archives", label: "Archives", shortLabel: "Zips", icon: Archive },
  { href: "/favorites", label: "Favorites", shortLabel: "Saved", icon: Heart },
  { href: "/trash", label: "Trash", shortLabel: "Trash", icon: Trash2 },
  { href: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
] as const;

export const MOBILE_TAB_HREFS = ["/", "/files", "/photos", "/favorites"] as const;

export const MOBILE_MORE_HREFS = [
  "/videos",
  "/movies",
  "/music",
  "/documents",
  "/archives",
  "/trash",
  "/settings",
] as const;
