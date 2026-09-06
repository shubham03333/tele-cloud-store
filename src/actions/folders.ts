import "server-only";

import { folderCreateSchema, folderRenameSchema } from "@/lib/validations";
import { getContainer } from "@/lib/di";
import { sanitizeFilename } from "@/lib/security/sanitize";
import type { StorageCategory } from "@/types";

export async function createFolderAction(input: unknown) {
  const parsed = folderCreateSchema.parse(input);
  const { folders } = getContainer();
  return folders.create({
    name: sanitizeFilename(parsed.name),
    category: parsed.category,
    parent: parsed.parentId ? { connect: { id: parsed.parentId } } : undefined,
  });
}

export async function renameFolderAction(input: unknown) {
  const parsed = folderRenameSchema.parse(input);
  const { folders } = getContainer();
  return folders.rename(parsed.id, sanitizeFilename(parsed.name));
}

export async function listFoldersAction(category: StorageCategory, parentId: string | null) {
  const { folders } = getContainer();
  return folders.list(category, parentId);
}
