"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { sha256HexBrowser } from "@/utils/hash";

export interface UploadJob {
  id: string;
  name: string;
  progress: number;
  status: "hashing" | "uploading" | "paused" | "finalizing" | "done" | "error" | "cancelled";
  error?: string;
}

const CHUNK = 4 * 1024 * 1024;

export function useUploader(onComplete?: () => void) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);

  const update = (id: string, patch: Partial<UploadJob>) => {
    setJobs((current) => current.map((job) => (job.id === id ? { ...job, ...patch } : job)));
  };

  const uploadFile = useCallback(
    async (file: File, folderId?: string | null) => {
      const localId = crypto.randomUUID();
      setJobs((current) => [...current, { id: localId, name: file.name, progress: 0, status: "hashing" }]);
      try {
        const checksum = await sha256HexBrowser(file);
        const init = await fetch("/api/files/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
            checksum,
            folderId: folderId ?? null,
            chunkSize: CHUNK,
          }),
        });
        const initJson = await init.json();
        if (!init.ok) {
          throw new Error(initJson.error ?? "Failed to start upload");
        }

        update(localId, { id: initJson.sessionId, status: "uploading" });
        const sessionId = initJson.sessionId as string;
        const total = Math.ceil(file.size / CHUNK);

        for (let i = 0; i < total; i += 1) {
          const blob = file.slice(i * CHUNK, Math.min(file.size, (i + 1) * CHUNK));
          const put = await fetch(`/api/files/upload/chunk?sessionId=${sessionId}&chunkIndex=${i}`, {
            method: "PUT",
            body: blob,
          });
          if (!put.ok) {
            const err = await put.json();
            throw new Error(err.error ?? "Chunk upload failed");
          }
          update(sessionId, { progress: Math.round(((i + 1) / total) * 90) });
        }

        update(sessionId, { status: "finalizing", progress: 95 });
        const done = await fetch("/api/files/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const doneJson = await done.json();
        if (!done.ok) {
          throw new Error(doneJson.error ?? "Finalize failed");
        }
        update(sessionId, { status: "done", progress: 100 });
        toast.success(`Uploaded ${file.name}`);
        onComplete?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        update(localId, { status: "error", error: message });
        toast.error(message);
      }
    },
    [onComplete],
  );

  const pause = async (sessionId: string) => {
    await fetch("/api/files/upload", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action: "pause" }),
    });
    update(sessionId, { status: "paused" });
  };

  const resume = async (sessionId: string) => {
    await fetch("/api/files/upload", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action: "resume" }),
    });
    update(sessionId, { status: "uploading" });
  };

  const cancel = async (sessionId: string) => {
    await fetch("/api/files/upload", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action: "cancel" }),
    });
    update(sessionId, { status: "cancelled" });
  };

  const retry = (job: UploadJob, file: File) => {
    void uploadFile(file);
  };

  return { jobs, uploadFile, pause, resume, cancel, retry };
}
