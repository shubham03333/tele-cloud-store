import "server-only";

import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import bigInt from "big-integer";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { CustomFile } from "telegram/client/uploads";
import { getEnv } from "@/lib/env";
import { decryptString, encryptString } from "@/lib/encryption";
import { ChannelRepository, TelegramCredentialRepository } from "@/repositories";
import type { StorageCategory } from "@/types";

const globalForTelegram = globalThis as unknown as {
  nimbusTelegram?: TelegramClient;
  nimbusTelegramConnect?: Promise<TelegramClient>;
};

export class TelegramNotConfiguredError extends Error {
  constructor(message = "Telegram session is not configured") {
    super(message);
    this.name = "TelegramNotConfiguredError";
  }
}

type TelegramPeer = {
  peerId: string;
  accessHash?: string | null;
  username?: string | null;
};

export class TelegramStorageService {
  constructor(
    private readonly credentials: TelegramCredentialRepository,
    private readonly channels: ChannelRepository,
  ) {}

  async status() {
    const creds = await this.credentials.get();
    const channelRows = await this.channels.list();
    return {
      configured: Boolean(creds.encryptedSession),
      connected: creds.connected,
      lastConnectedAt: creds.lastConnectedAt?.toISOString() ?? null,
      lastError: creds.lastError,
      channels: channelRows.map((row) => ({
        category: row.category,
        title: row.title,
        peerId: row.peerId,
        username: row.username,
      })),
    };
  }

  async saveStringSession(stringSession: string): Promise<void> {
    const encrypted = encryptString(stringSession.trim());
    await this.credentials.saveSession(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
    await this.disconnect();
  }

  async connect(): Promise<TelegramClient> {
    if (globalForTelegram.nimbusTelegram?.connected) {
      return globalForTelegram.nimbusTelegram;
    }

    if (globalForTelegram.nimbusTelegramConnect) {
      return globalForTelegram.nimbusTelegramConnect;
    }

    const connectPromise = this.createClient();
    globalForTelegram.nimbusTelegramConnect = connectPromise;
    try {
      return await connectPromise;
    } finally {
      if (globalForTelegram.nimbusTelegramConnect === connectPromise) {
        globalForTelegram.nimbusTelegramConnect = undefined;
      }
    }
  }

  private async createClient(): Promise<TelegramClient> {
    if (globalForTelegram.nimbusTelegram) {
      await globalForTelegram.nimbusTelegram.disconnect().catch(() => undefined);
      globalForTelegram.nimbusTelegram = undefined;
    }

    const creds = await this.credentials.get();
    if (!creds.encryptedSession || !creds.sessionIv || !creds.sessionAuthTag) {
      throw new TelegramNotConfiguredError();
    }

    const session = decryptString({
      ciphertext: creds.encryptedSession,
      iv: creds.sessionIv,
      authTag: creds.sessionAuthTag,
    });

    const env = getEnv();
    const client = new TelegramClient(new StringSession(session), Number(env.TELEGRAM_API_ID), env.TELEGRAM_API_HASH, {
      connectionRetries: 5,
    });

    try {
      await client.connect();
      if (!(await client.checkAuthorization())) {
        throw new TelegramNotConfiguredError("Telegram string session is not authorized");
      }
      globalForTelegram.nimbusTelegram = client;
      await this.credentials.markStatus(true, null);
      return client;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Telegram connection failed";
      await this.credentials.markStatus(false, message);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await globalForTelegram.nimbusTelegramConnect?.catch(() => undefined);
    const client = globalForTelegram.nimbusTelegram;
    if (client) {
      await client.disconnect();
      globalForTelegram.nimbusTelegram = undefined;
    }
  }

  async bindChannel(category: StorageCategory, peer: string) {
    const client = await this.connect();
    const entity = await client.getEntity(peer);
    const id = "id" in entity ? String(entity.id) : peer;
    const title =
      ("title" in entity && typeof entity.title === "string" && entity.title) ||
      ("username" in entity && typeof entity.username === "string" && entity.username) ||
      peer;
    const accessHash = "accessHash" in entity ? String(entity.accessHash) : null;
    const username = "username" in entity && typeof entity.username === "string" ? entity.username : null;

    return this.channels.upsert({
      category,
      peerId: id,
      accessHash,
      title,
      username,
    });
  }

  async resolvePeer(category: StorageCategory) {
    const channel = await this.channels.findByCategory(category);
    if (!channel) {
      throw new Error(`No Telegram channel bound for category "${category}"`);
    }
    return channel;
  }

  async listChannelMedia(category: StorageCategory, limit = 100) {
    const client = await this.connect();
    const channel = await this.resolvePeer(category);
    const entity = channel.username
      ? await client.getInputEntity(channel.username)
      : channel.accessHash
        ? new Api.InputPeerChannel({ channelId: bigInt(channel.peerId), accessHash: bigInt(channel.accessHash) })
        : await client.getInputEntity(channel.peerId);
    const media: {
      messageId: number;
      filename: string;
      mimeType: string;
      sizeBytes: bigint;
      uploadedAt: Date;
    }[] = [];

    for await (const message of client.iterMessages(entity, { limit })) {
      const file = message.file;
      if (!file) continue;
      const size = file.size;
      media.push({
        messageId: Number(message.id),
        filename: file.name || `${category}-${message.id}`,
        mimeType: file.mimeType || "application/octet-stream",
        sizeBytes: BigInt(size?.toString() ?? "0"),
        uploadedAt: message.date ? new Date(Number(message.date) * 1000) : new Date(),
      });
    }

    return { channel, media };
  }

  async uploadLocalFile(input: {
    filePath: string;
    filename: string;
    sizeBytes: number;
    category: StorageCategory;
    onProgress?: (ratio: number) => void;
    abort?: { canceled: boolean };
  }): Promise<{ messageId: number; peerId: string; channelId: string }> {
    const client = await this.connect();
    const channel = await this.resolvePeer(input.category);
    const target = channel.username
      ? await client.getInputEntity(channel.username)
      : channel.accessHash
        ? new Api.InputPeerChannel({
            channelId: bigInt(channel.peerId),
            accessHash: bigInt(channel.accessHash),
          })
        : await client.getInputEntity(channel.peerId);
    const customFile = new CustomFile(input.filename, input.sizeBytes, input.filePath);

    const onProgress = ((ratio: number) => {
      input.onProgress?.(ratio);
    }) as ((ratio: number) => void) & { isCanceled?: boolean };

    if (input.abort) {
      Object.defineProperty(onProgress, "isCanceled", {
        get: () => input.abort?.canceled ?? false,
      });
    }

    const message = await client.sendFile(target, {
      file: customFile,
      caption: input.filename,
      forceDocument: true,
      workers: 2,
      progressCallback: onProgress,
    });

    if (!message) {
      throw new Error("Telegram did not return a message after upload");
    }

    return {
      messageId: message.id,
      peerId: channel.peerId,
      channelId: channel.id,
    };
  }

  async downloadToBuffer(peer: TelegramPeer, messageId: number): Promise<Buffer> {
    const client = await this.connect();
    const messages = await client.getMessages(await this.resolveInputPeer(client, peer), { ids: messageId });
    const message = messages[0];
    if (!message?.media) {
      throw new Error("Telegram message media is missing");
    }
    const data = await client.downloadMedia(message, {});
    if (!data || typeof data === "string") {
      throw new Error("Failed to download media from Telegram");
    }
    return Buffer.from(data);
  }

  async streamDownload(
    peer: TelegramPeer,
    messageId: number,
    range?: { start: number; length?: number },
  ): Promise<ReadableStream<Uint8Array>> {
    const client = await this.connect();
    const messages = await client.getMessages(await this.resolveInputPeer(client, peer), { ids: messageId });
    const message = messages[0];
    if (!message) {
      throw new Error("Telegram message not found");
    }

    if (!message.media) {
      throw new Error("Telegram message media is missing");
    }

    const iterator = client.iterDownload({
      file: message.media,
      ...(range ? { offset: bigInt(range.start), limit: range.length } : {}),
      requestSize: 2 * 1024 * 1024,
      msgData: [peer.peerId, messageId],
    })[Symbol.asyncIterator]();

    return new ReadableStream({
      async pull(controller) {
        try {
          const { value, done } = await iterator.next();
          if (done || !value) {
            controller.close();
            return;
          }
          controller.enqueue(new Uint8Array(value));
        } catch (error) {
          controller.error(error);
        }
      },
      async cancel() {
        await iterator.return?.();
      },
    });
  }

  private async resolveInputPeer(client: TelegramClient, peer: TelegramPeer) {
    if (peer.username) {
      return client.getInputEntity(peer.username);
    }
    if (peer.accessHash) {
      return new Api.InputPeerChannel({
        channelId: bigInt(peer.peerId),
        accessHash: bigInt(peer.accessHash),
      });
    }
    return peer.peerId;
  }

  async forwardMessage(fromPeer: string, messageId: number, toPeer: string): Promise<number> {
    const client = await this.connect();
    const forwarded = await client.forwardMessages(toPeer, {
      messages: messageId,
      fromPeer,
    });
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const id = first && "id" in first ? Number(first.id) : messageId;
    return id;
  }

  async deleteMessage(peerId: string, messageId: number): Promise<void> {
    const client = await this.connect();
    await client.deleteMessages(peerId, [messageId], { revoke: true });
  }

  async getMe() {
    const client = await this.connect();
    const me = await client.getMe();
    return {
      id: String(me.id),
      username: "username" in me ? me.username ?? null : null,
    };
  }
}

export async function writeTempChunk(sessionId: string, chunkIndex: number, data: Buffer): Promise<string> {
  const dir = path.join(process.cwd(), ".uploads", sessionId);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${chunkIndex}.part`);
  await writeFile(filePath, data);
  return filePath;
}

export async function assembleChunks(sessionId: string, chunkCount: number, destName: string): Promise<string> {
  const dir = path.join(process.cwd(), ".uploads", sessionId);
  const dest = path.join(dir, destName);
  const parts: Buffer[] = [];
  for (let i = 0; i < chunkCount; i += 1) {
    parts.push(await readFile(path.join(dir, `${i}.part`)));
  }
  await writeFile(dest, Buffer.concat(parts));
  return dest;
}

export async function removeUploadDir(sessionId: string): Promise<void> {
  const dir = path.join(process.cwd(), ".uploads", sessionId);
  try {
    const { rm } = await import("node:fs/promises");
    await rm(dir, { recursive: true, force: true });
  } catch {
    await unlink(dir).catch(() => undefined);
  }
}

export type { Api };
