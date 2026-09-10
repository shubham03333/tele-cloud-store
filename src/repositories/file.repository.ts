import type { FileObject, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { FileDto, PaginatedResult, SortField, SortOrder, StorageCategory } from "@/types";

export interface FileListParams {
  category?: StorageCategory;
  folderId?: string | null;
  q?: string;
  sort: SortField;
  order: SortOrder;
  favorite?: boolean;
  deleted?: boolean;
  mime?: string;
  cursor?: string;
  limit: number;
}

function toDto(file: FileObject & { tags?: { tag: { name: string } }[] }): FileDto {
  return {
    id: file.id,
    filename: file.filename,
    originalName: file.originalName,
    messageId: file.messageId,
    telegramPeerId: file.telegramPeerId,
    channelId: file.channelId,
    uploadedAt: file.uploadedAt.toISOString(),
    sizeBytes: file.sizeBytes.toString(),
    mimeType: file.mimeType,
    checksum: file.checksum,
    folderId: file.folderId,
    favorite: file.favorite,
    deleted: file.deleted,
    deletedAt: file.deletedAt?.toISOString() ?? null,
    category: file.category as FileDto["category"],
    pinned: file.pinned,
    tags: file.tags?.map((entry) => entry.tag.name) ?? [],
  };
}

export class FileRepository {
  toDto = toDto;

  async create(data: Prisma.FileObjectCreateInput): Promise<FileDto> {
    const file = await prisma.fileObject.create({ data, include: { tags: { include: { tag: true } } } });
    return toDto(file);
  }

  async findByTelegramMessage(channelId: string, messageId: number) {
    return prisma.fileObject.findFirst({ where: { channelId, messageId } });
  }

  async findById(id: string) {
    return prisma.fileObject.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } }, channel: true },
    });
  }

  async list(params: FileListParams): Promise<PaginatedResult<FileDto>> {
    const where: Prisma.FileObjectWhereInput = {
      deleted: params.deleted ?? false,
    };

    if (params.category) {
      where.category = params.category;
    }
    if (params.favorite !== undefined) {
      where.favorite = params.favorite;
    }
    if (params.mime) {
      where.mimeType = { startsWith: params.mime };
    }
    if (params.folderId !== undefined) {
      where.folderId = params.folderId;
    }
    if (params.q) {
      where.OR = [
        { filename: { contains: params.q } },
        { originalName: { contains: params.q } },
      ];
    }

    const items = await prisma.fileObject.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { [params.sort]: params.order },
      take: params.limit + 1,
      ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
    });

    const hasMore = items.length > params.limit;
    const slice = hasMore ? items.slice(0, params.limit) : items;
    return {
      items: slice.map(toDto),
      nextCursor: hasMore ? slice[slice.length - 1]?.id ?? null : null,
      hasMore,
    };
  }

  async recent(limit = 8): Promise<FileDto[]> {
    const items = await prisma.fileObject.findMany({
      where: { deleted: false },
      include: { tags: { include: { tag: true } } },
      orderBy: { uploadedAt: "desc" },
      take: limit,
    });
    return items.map(toDto);
  }

  async pinned(): Promise<FileDto[]> {
    const items = await prisma.fileObject.findMany({
      where: { deleted: false, pinned: true },
      include: { tags: { include: { tag: true } } },
      orderBy: { updatedAt: "desc" },
      take: 12,
    });
    return items.map(toDto);
  }

  async remove(id: string): Promise<void> {
    await prisma.fileObject.delete({ where: { id } });
  }

  async update(id: string, data: Prisma.FileObjectUpdateInput): Promise<FileDto> {
    const file = await prisma.fileObject.update({
      where: { id },
      data,
      include: { tags: { include: { tag: true } } },
    });
    return toDto(file);
  }

  async stats() {
    const groups = await prisma.fileObject.groupBy({
      by: ["category"],
      where: { deleted: false },
      _sum: { sizeBytes: true },
      _count: { _all: true },
    });

    const byCategory: Record<string, { bytes: string; count: number }> = {};
    let total = BigInt(0);
    let fileCount = 0;
    for (const group of groups) {
      const bytes = group._sum.sizeBytes ?? BigInt(0);
      byCategory[group.category] = { bytes: bytes.toString(), count: group._count._all };
      total += bytes;
      fileCount += group._count._all;
    }

    return { totalBytes: total.toString(), fileCount, byCategory };
  }
}
