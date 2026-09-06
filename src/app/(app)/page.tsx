"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/top-bar";
import { Dropzone } from "@/components/files/dropzone";
import { formatBytes } from "@/lib/utils";
import type { FileDto, StorageStats } from "@/types";
import { CATEGORY_LABELS } from "@/lib/categories";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [data, setData] = useState<{
    stats: StorageStats;
    recent: FileDto[];
    pinned: FileDto[];
  } | null>(null);

  function load() {
    void fetch("/api/stats")
      .then((response) => response.json())
      .then(setData);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <TopBar title="Home" />
      {!data ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <Dropzone onUploaded={load}>
          <div className="grid gap-3 md:grid-cols-3 md:gap-4">
            <section className="glass rounded-[24px] p-4 sm:p-5">
              <p className="text-sm text-muted-foreground">Storage used</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{formatBytes(BigInt(data.stats.totalBytes))}</p>
              <p className="mt-1 text-sm text-muted-foreground">{data.stats.fileCount} files on Telegram</p>
            </section>
            <section className="glass rounded-[24px] p-4 sm:p-5 md:col-span-2">
              <p className="text-sm text-muted-foreground">Libraries</p>
              <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:flex-wrap md:overflow-visible">
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <Link
                    key={key}
                    href={`/${key}`}
                    className="shrink-0 rounded-full bg-muted px-3 py-2 text-sm md:py-1"
                  >
                    {label}
                    <span className="ml-2 text-muted-foreground">{data.stats.byCategory[key]?.count ?? 0}</span>
                  </Link>
                ))}
              </div>
            </section>
            <section className="glass rounded-[24px] p-4 sm:p-5">
              <p className="text-sm text-muted-foreground">Pinned</p>
              <ul className="mt-3 space-y-2">
                {data.pinned.length === 0 ? <li className="text-sm text-muted-foreground">No pins yet</li> : null}
                {data.pinned.map((file) => (
                  <li key={file.id} className="truncate text-sm">
                    {file.filename}
                  </li>
                ))}
              </ul>
            </section>
            <section className="glass rounded-[24px] p-4 sm:p-5 md:col-span-2">
              <p className="text-sm text-muted-foreground">Recent uploads</p>
              <ul className="mt-3 space-y-3">
                {data.recent.length === 0 ? (
                  <li className="text-sm text-muted-foreground">Upload your first file to see activity.</li>
                ) : null}
                {data.recent.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{file.filename}</span>
                    <span className="shrink-0 text-muted-foreground">{formatBytes(BigInt(file.sizeBytes))}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </Dropzone>
      )}
    </div>
  );
}
