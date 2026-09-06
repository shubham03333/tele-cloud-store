"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import type { FileDto } from "@/types";
import { Button } from "@/components/ui/button";

export function MediaPreview({ file, onClose }: { file: FileDto; onClose: () => void }) {
  const src = `/api/files/${file.id}/preview`;
  const [text, setText] = useState<string | null>(null);
  const [zipInfo, setZipInfo] = useState<string | null>(null);

  useEffect(() => {
    if (file.mimeType.startsWith("text/") || file.filename.endsWith(".md")) {
      void fetch(src)
        .then((response) => response.text())
        .then(setText);
    }
    if (file.mimeType.includes("zip") || file.filename.endsWith(".zip")) {
      void fetch(src)
        .then((response) => response.arrayBuffer())
        .then((buffer) => {
          const view = new DataView(buffer);
          let count = 0;
          for (let i = 0; i < view.byteLength - 4; i += 1) {
            if (view.getUint32(i, true) === 0x02014b50) {
              count += 1;
            }
          }
          setZipInfo(`${count} central directory entries`);
        });
    }
  }, [file, src]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-md sm:items-center sm:justify-center sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass relative max-h-[92dvh] w-full overflow-auto rounded-t-[28px] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-w-4xl sm:rounded-[28px] sm:p-5 sm:pb-5"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.filename}</p>
            <p className="text-xs text-muted-foreground">{file.mimeType}</p>
          </div>
          <Button variant="secondary" size="icon" className="shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {file.mimeType.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={file.filename} className="max-h-[70dvh] w-full rounded-2xl object-contain" />
        ) : null}

        {file.mimeType.startsWith("video/") ? (
          <video src={src} controls playsInline className="w-full rounded-2xl" />
        ) : null}

        {file.mimeType.startsWith("audio/") ? (
          <audio src={src} controls className="w-full" />
        ) : null}

        {file.mimeType === "application/pdf" ? (
          <iframe title={file.filename} src={src} className="h-[70dvh] w-full rounded-2xl bg-white" />
        ) : null}

        {text !== null ? (
          <pre className="overflow-auto rounded-2xl bg-black/20 p-4 text-xs leading-6">{text}</pre>
        ) : null}

        {zipInfo ? <p className="text-sm text-muted-foreground">{zipInfo}</p> : null}

        {!file.mimeType.startsWith("image/") &&
        !file.mimeType.startsWith("video/") &&
        !file.mimeType.startsWith("audio/") &&
        file.mimeType !== "application/pdf" &&
        text === null &&
        !zipInfo ? (
          <p className="text-sm text-muted-foreground">No inline preview. Download the file instead.</p>
        ) : null}

        <a
          href={`/api/files/${file.id}/download`}
          className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground sm:h-10 sm:w-auto sm:px-5"
        >
          Download
        </a>
      </motion.div>
    </div>
  );
}
