"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { FileDto, PaginatedResult, StorageCategory } from "@/types";

type FileListCacheEntry = {
  items: FileDto[];
  cursor: string | null;
  hasMore: boolean;
};

const fileListCache = new Map<string, FileListCacheEntry>();

function cacheKey(params: {
  category?: StorageCategory;
  folderId?: string | null;
  q?: string;
  favorite?: boolean;
  deleted?: boolean;
  sort: string;
  order: string;
}) {
  return JSON.stringify(params);
}

export function useFileList(params: {
  category?: StorageCategory;
  folderId?: string | null;
  q?: string;
  favorite?: boolean;
  deleted?: boolean;
}) {
  const [items, setItems] = useState<FileDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState("uploadedAt");
  const [order, setOrder] = useState("desc");
  const key = cacheKey({ ...params, sort, order });
  const load = useCallback(
    async (next?: string | null, replace = false) => {
      const cached = fileListCache.get(key);
      if (!next && cached && !replace) {
        setItems(cached.items);
        setCursor(cached.cursor);
        setHasMore(cached.hasMore);
        setLoading(false);
      } else if (!cached || replace) {
        setLoading(true);
      }

      const url = new URLSearchParams();
      if (params.category) url.set("category", params.category);
      if (params.folderId) url.set("folderId", params.folderId);
      if (params.q) url.set("q", params.q);
      if (params.favorite) url.set("favorite", "true");
      if (params.deleted) url.set("deleted", "true");
      url.set("sort", sort);
      url.set("order", order);
      if (next) url.set("cursor", next);
      try {
        const response = await fetch(`/api/files?${url.toString()}`);
        const data = (await response.json()) as PaginatedResult<FileDto> & { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load files");
        }

        const current = fileListCache.get(key);
        const items = next && current ? [...current.items, ...data.items] : data.items;
        const entry = { items, cursor: data.nextCursor, hasMore: data.hasMore };
        fileListCache.set(key, entry);
        setItems(entry.items);
        setCursor(entry.cursor);
        setHasMore(entry.hasMore);
        setLoading(false);
      } catch (error) {
        setLoading(false);
        toast.error(error instanceof Error ? error.message : "Failed to load files");
      }
    },
    [key, order, params.category, params.deleted, params.favorite, params.folderId, params.q, sort],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, hasMore, cursor, load, view, setView, sort, setSort, order, setOrder, setItems };
}

export function useInfiniteSentinel(onVisible: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const node = ref.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        onVisible();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [onVisible, enabled]);
  return ref;
}
