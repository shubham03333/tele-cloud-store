import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { FolderDto, StorageCategory } from "@/types";

function toDto(folder: { id: string; name: string; parentId: string | null; category: string; createdAt: Date }): FolderDto {
  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    category: folder.category as StorageCategory,
    createdAt: folder.createdAt.toISOString(),
  };
}

export class FolderRepository {
  async create(data: Prisma.FolderCreateInput): Promise<FolderDto> {
    return toDto(await prisma.folder.create({ data }));
  }

  async findById(id: string) {
    return prisma.folder.findUnique({ where: { id } });
  }

  async list(category: StorageCategory, parentId: string | null): Promise<FolderDto[]> {
    const folders = await prisma.folder.findMany({
      where: { category, parentId },
      orderBy: { name: "asc" },
    });
    return folders.map(toDto);
  }

  async ancestors(id: string): Promise<FolderDto[]> {
    const chain: FolderDto[] = [];
    let current = await prisma.folder.findUnique({ where: { id } });
    while (current) {
      chain.unshift(toDto(current));
      if (!current.parentId) {
        break;
      }
      current = await prisma.folder.findUnique({ where: { id: current.parentId } });
    }
    return chain;
  }

  async rename(id: string, name: string): Promise<FolderDto> {
    return toDto(await prisma.folder.update({ where: { id }, data: { name } }));
  }

  async remove(id: string): Promise<void> {
    await prisma.folder.delete({ where: { id } });
  }
}
