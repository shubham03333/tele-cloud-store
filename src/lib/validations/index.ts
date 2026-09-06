import { z } from "zod";
import { STORAGE_CATEGORIES } from "@/types";

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
  folderId: z.string().cuid().nullable().optional(),
  category: z.enum(STORAGE_CATEGORIES).optional(),
  q: z.string().max(200).optional(),
  sort: z.enum(["filename", "uploadedAt", "sizeBytes", "mimeType"]).default("uploadedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  favorite: z.coerce.boolean().optional(),
  deleted: z.coerce.boolean().optional(),
  mime: z.string().max(120).optional(),
});

export const renameSchema = z.object({
  id: z.string().cuid(),
  filename: z.string().min(1).max(180),
});

export const moveSchema = z.object({
  id: z.string().cuid(),
  folderId: z.string().cuid().nullable(),
});

export const folderCreateSchema = z.object({
  name: z.string().min(1).max(80),
  parentId: z.string().cuid().nullable().optional(),
  category: z.enum(STORAGE_CATEGORIES),
});

export const folderRenameSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(80),
});

export const telegramSessionSchema = z.object({
  stringSession: z.string().min(20).max(8000),
});

export const channelBindSchema = z.object({
  category: z.enum(STORAGE_CATEGORIES),
  peer: z.string().min(1).max(128),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(10).max(128),
});

export const uploadInitSchema = z.object({
  filename: z.string().min(1).max(180),
  mimeType: z.string().min(1).max(180),
  sizeBytes: z.number().int().positive().max(2_000_000_000),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  folderId: z.string().cuid().nullable().optional(),
  category: z.enum(STORAGE_CATEGORIES).optional(),
  chunkSize: z.number().int().min(64 * 1024).max(4 * 1024 * 1024).default(512 * 1024),
});
