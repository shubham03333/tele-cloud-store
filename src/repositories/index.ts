import { prisma } from "@/lib/db";
import type { StorageCategory } from "@/types";

export class ChannelRepository {
  async upsert(input: {
    category: StorageCategory;
    peerId: string;
    accessHash?: string | null;
    title: string;
    username?: string | null;
  }) {
    return prisma.telegramChannel.upsert({
      where: { category: input.category },
      create: {
        category: input.category,
        peerId: input.peerId,
        accessHash: input.accessHash ?? null,
        title: input.title,
        username: input.username ?? null,
      },
      update: {
        peerId: input.peerId,
        accessHash: input.accessHash ?? null,
        title: input.title,
        username: input.username ?? null,
      },
    });
  }

  async findByCategory(category: StorageCategory) {
    return prisma.telegramChannel.findUnique({ where: { category } });
  }

  async list() {
    return prisma.telegramChannel.findMany({ orderBy: { category: "asc" } });
  }
}

export class TelegramCredentialRepository {
  async get() {
    return prisma.telegramCredential.upsert({
      where: { id: "primary" },
      create: { id: "primary" },
      update: {},
    });
  }

  async saveSession(encryptedSession: string, sessionIv: string, sessionAuthTag: string) {
    return prisma.telegramCredential.upsert({
      where: { id: "primary" },
      create: {
        id: "primary",
        encryptedSession,
        sessionIv,
        sessionAuthTag,
        connected: false,
      },
      update: { encryptedSession, sessionIv, sessionAuthTag },
    });
  }

  async markStatus(connected: boolean, lastError?: string | null) {
    return prisma.telegramCredential.update({
      where: { id: "primary" },
      data: {
        connected,
        lastError: lastError ?? null,
        lastConnectedAt: connected ? new Date() : undefined,
      },
    });
  }
}

export class AuditRepository {
  async write(entry: {
    userId?: string | null;
    action: string;
    resource?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        ipAddress: entry.ipAddress,
      },
    });
  }

  async recent(limit = 20) {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}

export class LoginHistoryRepository {
  async record(input: {
    userId: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    reason?: string;
  }) {
    await prisma.loginHistory.create({ data: input });
  }

  async list(userId: string, limit = 20) {
    return prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}

export class UploadSessionRepository {
  async create(data: {
    filename: string;
    mimeType: string;
    sizeBytes: bigint;
    checksum: string;
    folderId?: string | null;
    category: string;
    chunkSize: number;
    tempPath: string;
  }) {
    return prisma.uploadSession.create({
      data: { ...data, status: "active" },
    });
  }

  async findById(id: string) {
    return prisma.uploadSession.findUnique({ where: { id } });
  }

  async saveChunk(sessionId: string, chunkIndex: number, data: Buffer) {
    return prisma.uploadChunk.upsert({
      where: { sessionId_chunkIndex: { sessionId, chunkIndex } },
      create: { sessionId, chunkIndex, data },
      update: { data },
    });
  }

  async listChunks(sessionId: string) {
    return prisma.uploadChunk.findMany({
      where: { sessionId },
      orderBy: { chunkIndex: "asc" },
    });
  }

  async deleteChunks(sessionId: string) {
    await prisma.uploadChunk.deleteMany({ where: { sessionId } });
  }

  async update(
    id: string,
    data: {
      receivedBytes?: bigint;
      status?: string;
    },
  ) {
    return prisma.uploadSession.update({ where: { id }, data });
  }
}
