import "server-only";

import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FileRepository } from "@/repositories/file.repository";
import { FolderRepository } from "@/repositories/folder.repository";
import {
  AuditRepository,
  ChannelRepository,
  UploadSessionRepository,
} from "@/repositories";
import { TelegramStorageService } from "@/services/telegram.service";
import type { VirusScanner } from "@/services/virus-scanner";
import { inferCategory } from "@/lib/categories";
import { sanitizeFilename } from "@/lib/security/sanitize";
import { hmacSign, hmacVerify, sha256Hex } from "@/lib/encryption";
import { getEnv } from "@/lib/env";
import type { FileDto, StorageCategory } from "@/types";
import type { FileListParams } from "@/repositories/file.repository";

export class FileService {
  constructor(
    private readonly files: FileRepository,
    private readonly folders: FolderRepository,
    private readonly uploads: UploadSessionRepository,
    private readonly telegram: TelegramStorageService,
    private readonly audit: AuditRepository,
    private readonly channels: ChannelRepository,
    private readonly scanner: VirusScanner,
  ) {}

  list(params: FileListParams) {
    return this.files.list(params);
  }

  recent() {
    return this.files.recent();
  }

  pinned() {
    return this.files.pinned();
  }

  stats() {
    return this.files.stats();
  }

  async get(id: string) {
    const file = await this.files.findById(id);
    if (!file || file.deleted) {
      return null;
    }
    return this.files.toDto(file);
  }

  async initUpload(input: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    checksum: string;
    folderId?: string | null;
    category?: StorageCategory;
    chunkSize: number;
    userId: string;
    ipAddress?: string;
  }) {
    const filename = sanitizeFilename(input.filename);
    const category = input.category ?? inferCategory(input.mimeType, filename);
    const channel = await this.channels.findByCategory(category);
    if (!channel) {
      throw new Error(`Bind a Telegram channel for ${category} before uploading`);
    }

    const session = await this.uploads.create({
      filename,
      mimeType: input.mimeType,
      sizeBytes: BigInt(input.sizeBytes),
      checksum: input.checksum,
      folderId: input.folderId ?? null,
      category,
      chunkSize: input.chunkSize,
      tempPath: "",
    });

    await this.uploads.update(session.id, {});

    await this.audit.write({
      userId: input.userId,
      action: "upload.init",
      resource: "file",
      resourceId: session.id,
      ipAddress: input.ipAddress,
      metadata: { filename, category, sizeBytes: input.sizeBytes },
    });

    return { ...session, tempPath: "", category };
  }

  async appendChunk(sessionId: string, chunkIndex: number, data: Buffer) {
    const session = await this.uploads.findById(sessionId);
    if (!session || session.status === "cancelled") {
      throw new Error("Upload session is not active");
    }
    if (session.status === "paused") {
      throw new Error("Upload is paused");
    }

    await this.uploads.saveChunk(sessionId, chunkIndex, data);

    const chunks = await this.uploads.listChunks(sessionId);
    const received = chunks.reduce((total, chunk) => total + BigInt(chunk.data.length), 0n);
    await this.uploads.update(sessionId, { receivedBytes: received, status: "active" });
    return { receivedBytes: received.toString(), sizeBytes: session.sizeBytes.toString() };
  }

  async pause(sessionId: string) {
    return this.uploads.update(sessionId, { status: "paused" });
  }

  async resume(sessionId: string) {
    return this.uploads.update(sessionId, { status: "active" });
  }

  async cancel(sessionId: string) {
    await this.uploads.update(sessionId, { status: "cancelled" });
    await this.uploads.deleteChunks(sessionId);
  }

  async completeUpload(sessionId: string, userId: string, ipAddress?: string): Promise<FileDto> {
    const session = await this.uploads.findById(sessionId);
    if (!session) {
      throw new Error("Upload session not found");
    }

    const chunkCount = Math.ceil(Number(session.sizeBytes) / session.chunkSize);
    const chunks = await this.uploads.listChunks(sessionId);
    if (chunks.length !== chunkCount || chunks.some((chunk, index) => chunk.chunkIndex !== index)) {
      throw new Error("Upload is missing one or more chunks");
    }
    const fileBuffer = Buffer.concat(chunks.map((chunk) => chunk.data));

    const checksum = sha256Hex(fileBuffer);
    if (checksum !== session.checksum) {
      await this.uploads.update(sessionId, { status: "failed" });
      throw new Error("Checksum mismatch");
    }

    const scan = await this.scanner.scan(fileBuffer, session.filename);
    if (!scan.clean) {
      await this.uploads.update(sessionId, { status: "failed" });
      throw new Error(`File rejected by virus scanner (${scan.engine})`);
    }

    const assembled = path.join(tmpdir(), `nimbus-${sessionId}-${session.filename}`);
    await writeFile(assembled, fileBuffer);
    let uploaded;
    try {
      uploaded = await this.telegram.uploadLocalFile({
        filePath: assembled,
        filename: session.filename,
        sizeBytes: Number(session.sizeBytes),
        category: session.category as StorageCategory,
      });
    } finally {
      await unlink(assembled).catch(() => undefined);
    }

    const file = await this.files.create({
      filename: session.filename,
      originalName: session.filename,
      messageId: uploaded.messageId,
      telegramPeerId: uploaded.peerId,
      channel: { connect: { id: uploaded.channelId } },
      sizeBytes: session.sizeBytes,
      mimeType: session.mimeType,
      checksum,
      category: session.category,
      folder: session.folderId ? { connect: { id: session.folderId } } : undefined,
    });

    await this.uploads.update(sessionId, { status: "completed" });
    await this.uploads.deleteChunks(sessionId);
    await this.audit.write({
      userId,
      action: "upload.complete",
      resource: "file",
      resourceId: file.id,
      ipAddress,
    });

    return file;
  }

  async rename(id: string, filename: string, userId: string): Promise<FileDto> {
    const safe = sanitizeFilename(filename);
    const updated = await this.files.update(id, { filename: safe });
    await this.audit.write({ userId, action: "file.rename", resource: "file", resourceId: id });
    return updated;
  }

  async move(id: string, folderId: string | null, userId: string): Promise<FileDto> {
    if (folderId) {
      const folder = await this.folders.findById(folderId);
      if (!folder) {
        throw new Error("Folder not found");
      }
    }
    const updated = await this.files.update(id, {
      folder: folderId ? { connect: { id: folderId } } : { disconnect: true },
    });
    await this.audit.write({ userId, action: "file.move", resource: "file", resourceId: id });
    return updated;
  }

  async setFavorite(id: string, favorite: boolean, userId: string): Promise<FileDto> {
    const updated = await this.files.update(id, { favorite });
    await this.audit.write({ userId, action: favorite ? "file.favorite" : "file.unfavorite", resource: "file", resourceId: id });
    return updated;
  }

  async setPinned(id: string, pinned: boolean): Promise<FileDto> {
    return this.files.update(id, { pinned });
  }

  async trash(id: string, userId: string): Promise<FileDto> {
    const updated = await this.files.update(id, { deleted: true, deletedAt: new Date() });
    await this.audit.write({ userId, action: "file.trash", resource: "file", resourceId: id });
    return updated;
  }

  async restore(id: string, userId: string): Promise<FileDto> {
    const updated = await this.files.update(id, { deleted: false, deletedAt: null });
    await this.audit.write({ userId, action: "file.restore", resource: "file", resourceId: id });
    return updated;
  }

  async purge(id: string, userId: string): Promise<void> {
    const file = await this.files.findById(id);
    if (!file) {
      return;
    }
    await this.telegram.deleteMessage(file.telegramPeerId, file.messageId);
    await this.files.remove(id);
    await this.audit.write({ userId, action: "file.purge", resource: "file", resourceId: id });
  }

  async duplicate(id: string, userId: string): Promise<FileDto> {
    const file = await this.files.findById(id);
    if (!file || file.deleted) {
      throw new Error("File not found");
    }
    const newMessageId = await this.telegram.forwardMessage(
      file.telegramPeerId,
      file.messageId,
      file.telegramPeerId,
    );
    const copy = await this.files.create({
      filename: `${file.filename.replace(/(\.[^.]+)?$/, " copy$1")}`,
      originalName: file.originalName,
      messageId: newMessageId,
      telegramPeerId: file.telegramPeerId,
      channel: { connect: { id: file.channelId } },
      sizeBytes: file.sizeBytes,
      mimeType: file.mimeType,
      checksum: file.checksum,
      category: file.category,
      folder: file.folderId ? { connect: { id: file.folderId } } : undefined,
    });
    await this.audit.write({ userId, action: "file.duplicate", resource: "file", resourceId: copy.id });
    return copy;
  }

  copyLink(id: string): string {
    const env = getEnv();
    const secret = env.DOWNLOAD_LINK_SECRET ?? env.BETTER_AUTH_SECRET;
    const exp = Date.now() + 1000 * 60 * 60 * 24;
    const payload = `${id}.${exp}`;
    const sig = hmacSign(payload, secret);
    return `${env.NEXT_PUBLIC_APP_URL}/api/files/${id}/download?exp=${exp}&sig=${sig}`;
  }

  verifyLink(id: string, exp: string, sig: string): boolean {
    if (Number(exp) < Date.now()) {
      return false;
    }
    const env = getEnv();
    const secret = env.DOWNLOAD_LINK_SECRET ?? env.BETTER_AUTH_SECRET;
    return hmacVerify(`${id}.${exp}`, sig, secret);
  }

  async downloadStream(id: string, range?: { start: number; length?: number }) {
    const file = await this.files.findById(id);
    if (!file || file.deleted) {
      throw new Error("File not found");
    }
    const stream = await this.telegram.streamDownload(
      { peerId: file.telegramPeerId, accessHash: file.channel.accessHash, username: file.channel.username },
      file.messageId,
      range,
    );
    return { file, stream };
  }

  async previewBuffer(id: string) {
    const file = await this.files.findById(id);
    if (!file || file.deleted) {
      throw new Error("File not found");
    }
    const buffer = await this.telegram.downloadToBuffer(
      { peerId: file.telegramPeerId, accessHash: file.channel.accessHash, username: file.channel.username },
      file.messageId,
    );
    return { file, buffer };
  }
}
