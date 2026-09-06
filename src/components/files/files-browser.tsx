"use client";

import { Dropzone } from "@/components/files/dropzone";
import { FileManager } from "@/components/files/file-manager";
import { useFileList, useInfiniteSentinel } from "@/hooks/use-file-list";
import type { StorageCategory } from "@/types";

export function FilesBrowser({
  category,
  q,
  favorite,
  deleted,
}: {
  category?: StorageCategory;
  q?: string;
  favorite?: boolean;
  deleted?: boolean;
}) {
  const list = useFileList({ category, q, favorite, deleted });
  const sentinel = useInfiniteSentinel(() => {
    if (list.hasMore && list.cursor) {
      void list.load(list.cursor);
    }
  }, list.hasMore && !list.loading);

  return (
    <Dropzone onUploaded={() => void list.load(null, true)}>
      <FileManager
        items={list.items}
        loading={list.loading}
        view={list.view}
        onView={list.setView}
        onRefresh={() => void list.load(null, true)}
        deleted={deleted}
      />
      <div ref={sentinel} className="h-10" />
    </Dropzone>
  );
}
