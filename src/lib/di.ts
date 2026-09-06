import "server-only";

import { FileRepository } from "@/repositories/file.repository";
import { FolderRepository } from "@/repositories/folder.repository";
import {
  AuditRepository,
  ChannelRepository,
  LoginHistoryRepository,
  TelegramCredentialRepository,
  UploadSessionRepository,
} from "@/repositories";
import { TelegramStorageService } from "@/services/telegram.service";
import { FileService } from "@/services/file.service";
import { NoOpVirusScanner } from "@/services/virus-scanner";

let singleton: ReturnType<typeof buildContainer> | null = null;

function buildContainer() {
  const files = new FileRepository();
  const folders = new FolderRepository();
  const channels = new ChannelRepository();
  const credentials = new TelegramCredentialRepository();
  const audit = new AuditRepository();
  const loginHistory = new LoginHistoryRepository();
  const uploads = new UploadSessionRepository();
  const scanner = new NoOpVirusScanner();
  const telegram = new TelegramStorageService(credentials, channels);
  const fileService = new FileService(files, folders, uploads, telegram, audit, channels, scanner);

  return {
    files,
    folders,
    channels,
    credentials,
    audit,
    loginHistory,
    uploads,
    scanner,
    telegram,
    fileService,
  };
}

export function getContainer() {
  if (!singleton) {
    singleton = buildContainer();
  }
  return singleton;
}
