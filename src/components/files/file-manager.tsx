"use client";

import { useState } from "react";
import {
  Copy,
  CheckCircle2,
  Download,
  Eye,
  File,
  FileArchive,
  FileText,
  FolderInput,
  Grid2X2,
  Heart,
  Link2,
  List,
  Music,
  MoreHorizontal,
  Pencil,
  Pin,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import type { FileDto } from "@/types";
import { formatBytes, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { MediaPreview } from "@/components/media/media-preview";
import { BottomSheet } from "@/components/ui/bottom-sheet";

async function mutate(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data;
}

export function FileManager({
  items,
  loading,
  view,
  onView,
  onRefresh,
  deleted,
}: {
  items: FileDto[];
  loading: boolean;
  view: "grid" | "list";
  onView: (view: "grid" | "list") => void;
  onRefresh: () => void;
  deleted?: boolean;
}) {
  const [preview, setPreview] = useState<FileDto | null>(null);
  const [menuFile, setMenuFile] = useState<FileDto | null>(null);
  const [download, setDownload] = useState<{ name: string; progress: number | null; loaded: number; total: number | null } | null>(null);

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      toast.success(success);
      onRefresh();
      setMenuFile(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    }
  }

  async function downloadFile(file: FileDto) {
    setMenuFile(null);
    setDownload({ name: file.filename, progress: 0, loaded: 0, total: Number(file.sizeBytes) });
    try {
      const response = await fetch(`/api/files/${file.id}/download`);
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Download failed");
      }
      const totalHeader = response.headers.get("content-length");
      const total = totalHeader ? Number(totalHeader) : Number(file.sizeBytes);
      const reader = response.body.getReader();
      const chunks: ArrayBuffer[] = [];
      let loaded = 0;
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        if (result.value) {
          chunks.push(new Uint8Array(result.value).slice().buffer as ArrayBuffer);
          loaded += result.value.byteLength;
          setDownload({ name: file.filename, progress: total ? Math.round((loaded / total) * 100) : null, loaded, total });
        }
      }
      const blob = new Blob(chunks, { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setDownload({ name: file.filename, progress: 100, loaded, total });
      window.setTimeout(() => setDownload(null), 900);
    } catch (error) {
      setDownload(null);
      toast.error(error instanceof Error ? error.message : "Download failed");
    }
  }

  return (
    <div>
      {download ? (
        <div className="mb-5 overflow-hidden rounded-3xl border border-primary/15 bg-primary/[0.06] p-4 shadow-sm shadow-primary/5 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              {download.progress === 100 ? <CheckCircle2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium">{download.progress === 100 ? "Download ready" : `Downloading ${download.name}`}</span>
                <span className="shrink-0 text-xs font-medium text-primary">{download.progress === null ? "Preparing" : `${download.progress}%`}</span>
              </div>
              <Progress value={download.progress ?? 12} className="mt-3" />
              <p className="mt-2 text-xs text-muted-foreground">{download.progress === 100 ? download.name : `${formatBytes(BigInt(download.loaded))} of ${formatBytes(BigInt(download.total ?? 0))}`}</p>
            </div>
          </div>
        </div>
      ) : null}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{items.length} {items.length === 1 ? "item" : "items"}</p>
        <div className="glass flex rounded-full p-1" aria-label="Choose file view">
          <Button aria-label="Grid view" title="Grid view" size="icon" variant={view === "grid" ? "default" : "ghost"} onClick={() => onView("grid")}>
            <Grid2X2 className="h-4 w-4" />
          </Button>
          <Button aria-label="List view" title="List view" size="icon" variant={view === "list" ? "default" : "ghost"} onClick={() => onView("list")}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="glass h-36 animate-pulse rounded-[22px]" />
          ))}
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="glass flex min-h-52 flex-col items-center justify-center rounded-[24px] px-6 py-10 text-center">
          <p className="text-lg font-medium">Nothing here yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">Tap Upload to add files to your Telegram library.</p>
        </div>
      ) : null}

      {view === "grid" ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
          {items.map((file) => (
            <motion.div key={file.id} layout className="glass relative min-h-32 rounded-[22px] p-3 sm:p-4">
              <button
                type="button"
                className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-background/70"
                aria-label="File actions"
                onClick={() => setMenuFile(file)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              <button type="button" className="w-full pr-8 text-left" onClick={() => setPreview(file)}>
                <div className="mb-3 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-muted">
                  {isVisualFile(file) ? <FileVisual file={file} /> : <FileIcon file={file} large />}
                </div>
                <p className="line-clamp-2 text-sm font-medium leading-snug">{file.filename}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatBytes(BigInt(file.sizeBytes))}</p>
                <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{formatDate(file.uploadedAt)}</p>
              </button>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass divide-y divide-border overflow-hidden rounded-[24px]">
          {items.map((file) => (
            <div key={file.id} className="flex min-h-16 items-center gap-2 px-3 py-2 sm:px-4">
              {isVisualFile(file) ? (
                <button
                  type="button"
                  aria-label={`Preview ${file.filename}`}
                  className="h-12 w-14 shrink-0 overflow-hidden rounded-xl bg-muted"
                  onClick={() => setPreview(file)}
                >
                  <FileVisual file={file} />
                </button>
              ) : (
                <FileIcon file={file} />
              )}
              <button type="button" className="min-w-0 flex-1 py-2 text-left" onClick={() => setPreview(file)}>
                <p className="truncate text-sm font-medium">{file.filename}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(BigInt(file.sizeBytes))}</p>
              </button>
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                aria-label="File actions"
                onClick={() => setMenuFile(file)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {preview ? <MediaPreview file={preview} onClose={() => setPreview(null)} /> : null}
      <FileActionSheet
        file={menuFile}
        deleted={deleted}
        onClose={() => setMenuFile(null)}
        onPreview={() => {
          if (menuFile) {
            setPreview(menuFile);
            setMenuFile(null);
          }
        }}
        onDownload={() => {
          if (menuFile) void downloadFile(menuFile);
        }}
        run={run}
      />
    </div>
  );
}

function FileVisual({ file }: { file: FileDto }) {
  const src = `/api/files/${file.id}/preview`;

  if (file.mimeType.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />;
  }

  if (file.mimeType.startsWith("video/")) {
    return <video src={src} muted playsInline preload="metadata" className="h-full w-full object-cover" />;
  }

  return null;
}

function isVisualFile(file: FileDto) {
  return file.mimeType.startsWith("image/") || file.mimeType.startsWith("video/");
}

function FileIcon({ file, large = false }: { file: FileDto; large?: boolean }) {
  const Icon = file.mimeType.startsWith("audio/")
    ? Music
    : file.mimeType.includes("zip") || file.mimeType.includes("compressed")
      ? FileArchive
      : file.mimeType.startsWith("text/") || file.mimeType === "application/pdf"
        ? FileText
        : File;

  return (
    <div className={large ? "text-primary" : "flex h-12 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"}>
      <Icon className={large ? "h-10 w-10" : "h-5 w-5"} aria-hidden="true" />
    </div>
  );
}

function FileActionSheet({
  file,
  deleted,
  onClose,
  onPreview,
  onDownload,
  run,
}: {
  file: FileDto | null;
  deleted?: boolean;
  onClose: () => void;
  onPreview: () => void;
  onDownload: () => void;
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  if (!file) {
    return null;
  }

  const actions = deleted
    ? [
        {
          label: "Restore",
          icon: RotateCcw,
          onClick: () => run(() => mutate(`/api/files/${file.id}/restore`, { method: "POST" }), "Restored"),
        },
      ]
    : [
        { label: "Preview", icon: Eye, onClick: onPreview },
        { label: "Download", icon: Download, onClick: onDownload },
        {
          label: file.favorite ? "Unfavorite" : "Favorite",
          icon: Heart,
          onClick: () =>
            run(
              () =>
                mutate(`/api/files/${file.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ favorite: !file.favorite }),
                }),
              file.favorite ? "Removed from favorites" : "Favorited",
            ),
        },
        {
          label: file.pinned ? "Unpin" : "Pin",
          icon: Pin,
          onClick: () =>
            run(
              () =>
                mutate(`/api/files/${file.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ pinned: !file.pinned }),
                }),
              file.pinned ? "Unpinned" : "Pinned",
            ),
        },
        {
          label: "Rename",
          icon: Pencil,
          onClick: () => {
            const next = window.prompt("Rename file", file.filename);
            if (!next) return;
            void run(
              () =>
                mutate(`/api/files/${file.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ filename: next }),
                }),
              "Renamed",
            );
          },
        },
        {
          label: "Copy link",
          icon: Link2,
          onClick: () =>
            run(async () => {
              const data = await mutate(`/api/files/${file.id}/link`, { method: "POST" });
              await navigator.clipboard.writeText(data.url);
            }, "Link copied"),
        },
        {
          label: "Duplicate",
          icon: Copy,
          onClick: () => run(() => mutate(`/api/files/${file.id}/duplicate`, { method: "POST" }), "Duplicated"),
        },
        {
          label: "Move",
          icon: FolderInput,
          onClick: () => {
            const folderId = window.prompt("Destination folder ID (blank for root)") || null;
            void run(
              () =>
                mutate(`/api/files/${file.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ folderId }),
                }),
              "Moved",
            );
          },
        },
        {
          label: "Move to trash",
          icon: Trash2,
          danger: true,
          onClick: () => run(() => mutate(`/api/files/${file.id}`, { method: "DELETE" }), "Moved to trash"),
        },
      ];

  return (
    <BottomSheet open={Boolean(file)} title={file.filename} onClose={onClose}>
      <div className="flex flex-col gap-1">
        {actions.map((action) => {
          const Icon = action.icon;
          const className =
            "flex min-h-12 items-center gap-3 rounded-2xl px-3 text-left text-sm hover:bg-muted";
          if ("href" in action && action.href) {
            return (
              <a key={action.label} href={String(action.href)} className={className} onClick={onClose}>
                <Icon className="h-4 w-4" />
                {action.label}
              </a>
            );
          }
          return (
            <button
              key={action.label}
              type="button"
              className={`${className} ${"danger" in action && action.danger ? "text-destructive" : ""}`}
              onClick={action.onClick}
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
