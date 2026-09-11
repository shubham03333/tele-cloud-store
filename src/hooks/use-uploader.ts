"use client";

import { createContext, createElement, useCallback, useContext, useRef, useState } from "react";
import { toast } from "sonner";
import { sha256HexBrowser } from "@/utils/hash";

export interface UploadJob {
  id: string;
  name: string;
  progress: number;
  status: "queued" | "hashing" | "uploading" | "paused" | "finalizing" | "done" | "error" | "cancelled";
  error?: string;
}

const CHUNK = 4 * 1024 * 1024;
const MAX_ACTIVE_UPLOADS = 5;

type UploadComplete = () => void;

type QueuedUpload = {
  localId: string;
  file: File;
  folderId?: string | null;
  onComplete?: UploadComplete;
  resolve: () => void;
};

type Uploader = {
  jobs: UploadJob[];
  uploadFile: (file: File, folderId?: string | null, onComplete?: UploadComplete) => Promise<void>;
  pause: (sessionId: string) => Promise<void>;
  resume: (sessionId: string) => Promise<void>;
  cancel: (sessionId: string) => Promise<void>;
  retry: (job: UploadJob, file: File) => void;
};

const UploaderContext = createContext<Uploader | null>(null);

function useUploaderState(): Uploader {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const queue = useRef<QueuedUpload[]>([]);
  const activeUploads = useRef(0);

  const update = (id: string, patch: Partial<UploadJob>) => {
    setJobs((current) => current.map((job) => (job.id === id ? { ...job, ...patch } : job)));
  };

  const drainQueue = useCallback(async () => {
    while (activeUploads.current < MAX_ACTIVE_UPLOADS && queue.current.length > 0) {
      const queued = queue.current.shift();
      if (!queued) return;
      activeUploads.current += 1;
      void (async () => {
        let jobId = queued.localId;
        try {
          update(jobId, { status: "hashing" });
          const checksum = await sha256HexBrowser(queued.file);
          const init = await fetch("/api/files/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: queued.file.name,
              mimeType: queued.file.type || "application/octet-stream",
              sizeBytes: queued.file.size,
              checksum,
              folderId: queued.folderId ?? null,
              chunkSize: CHUNK,
            }),
          });
          const initJson = await init.json();
          if (!init.ok) throw new Error(initJson.error ?? "Failed to start upload");

          const sessionId = initJson.sessionId as string;
          jobId = sessionId;
          update(queued.localId, { id: sessionId, status: "uploading" });
          const total = Math.ceil(queued.file.size / CHUNK);
          let completed = 0;
          let nextChunk = 0;
          const uploadChunk = async () => {
            while (nextChunk < total) {
              const index = nextChunk;
              nextChunk += 1;
              const blob = queued.file.slice(index * CHUNK, Math.min(queued.file.size, (index + 1) * CHUNK));
              const put = await fetch(`/api/files/upload/chunk?sessionId=${sessionId}&chunkIndex=${index}`, {
                method: "PUT",
                body: blob,
              });
              if (!put.ok) {
                const err = await put.json();
                throw new Error(err.error ?? "Chunk upload failed");
              }
              completed += 1;
              update(jobId, { progress: Math.round((completed / total) * 90) });
            }
          };
          await Promise.all(Array.from({ length: Math.min(3, total) }, () => uploadChunk()));

          update(jobId, { status: "finalizing", progress: 95 });
          const done = await fetch("/api/files/upload/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          const doneJson = await done.json();
          if (!done.ok) throw new Error(doneJson.error ?? "Finalize failed");
          update(jobId, { status: "done", progress: 100 });
          window.setTimeout(() => setJobs((current) => current.filter((job) => job.id !== jobId)), 900);
          toast.success(`Uploaded ${queued.file.name}`);
          queued.onComplete?.();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Upload failed";
          update(jobId, { status: "error", error: message });
          toast.error(message);
        } finally {
          queued.resolve();
          activeUploads.current -= 1;
          void drainQueue();
        }
      })();
    }
  }, []);

  const uploadFile = useCallback(
    (file: File, folderId?: string | null, onComplete?: UploadComplete) => {
      const localId = crypto.randomUUID();
      setJobs((current) => [...current, { id: localId, name: file.name, progress: 0, status: "queued" }]);
      const promise = new Promise<void>((resolve) => {
        queue.current.push({ localId, file, folderId, onComplete, resolve });
      });
      void drainQueue();
      return promise;
    },
    [drainQueue],
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
    const queuedIndex = queue.current.findIndex((job) => job.localId === sessionId);
    if (queuedIndex >= 0) {
      const [queued] = queue.current.splice(queuedIndex, 1);
      queued.resolve();
      update(sessionId, { status: "cancelled" });
      return;
    }
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

export function UploaderProvider({ children }: { children: React.ReactNode }) {
  const uploader = useUploaderState();

  return createElement(UploaderContext.Provider, { value: uploader }, children);
}

export function useUploader() {
  const uploader = useContext(UploaderContext);
  if (!uploader) {
    throw new Error("useUploader must be used within UploaderProvider");
  }
  return uploader;
}
