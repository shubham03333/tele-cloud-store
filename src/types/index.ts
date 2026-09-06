export const STORAGE_CATEGORIES = [
  "files",
  "photos",
  "videos",
  "movies",
  "music",
  "documents",
  "archives",
] as const;

export type StorageCategory = (typeof STORAGE_CATEGORIES)[number];

export type FileListView = "grid" | "list";

export type SortField = "filename" | "uploadedAt" | "sizeBytes" | "mimeType";
export type SortOrder = "asc" | "desc";

export type UploadStatus =
  | "active"
  | "paused"
  | "cancelled"
  | "completed"
  | "failed";

export interface FileDto {
  id: string;
  filename: string;
  originalName: string;
  messageId: number;
  telegramPeerId: string;
  channelId: string;
  uploadedAt: string;
  sizeBytes: string;
  mimeType: string;
  checksum: string;
  folderId: string | null;
  favorite: boolean;
  deleted: boolean;
  deletedAt: string | null;
  category: StorageCategory;
  pinned: boolean;
  tags: string[];
}

export interface FolderDto {
  id: string;
  name: string;
  parentId: string | null;
  category: StorageCategory;
  createdAt: string;
}

export interface StorageStats {
  totalBytes: string;
  fileCount: number;
  byCategory: Record<string, { bytes: string; count: number }>;
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export interface VirusScanResult {
  clean: boolean;
  engine: string;
  details?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
