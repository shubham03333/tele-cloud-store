"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { FileDto, PaginatedResult, StorageCategory } from "@/types";

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
  const searchKey = [
    params.category ?? "",
    params.folderId ?? "",
    params.q ?? "",
    params.favorite ? "1" : "0",
    params.deleted ? "1" : "0",
    sort,
    order,
  ].join(":");

  const load = useCallback(
    async (next?: string | null, replace = false) => {
      setLoading(true);
      const url = new URLSearchParams();
      if (params.category) url.set("category", params.category);
      if (params.folderId) url.set("folderId", params.folderId);
      if (params.q) url.set("q", params.q);
      if (params.favorite) url.set("favorite", "true");
      if (params.deleted) url.set("deleted", "true");
      url.set("sort", sort);
      url.set("order", order);
      if (next) url.set("cursor", next);
      const response = await fetch(`/api/files?${url.toString()}`);
      const data = (await response.json()) as PaginatedResult<FileDto> & { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Failed to load files");
        setLoading(false);
        return;
      }
      setItems((current) => (replace || !next ? data.items : [...current, ...data.items]));
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
      setLoading(false);
    },
    [searchKey, params.category, params.deleted, params.favorite, params.folderId, params.q, sort, order],
  );

  useEffect(() => {
    void load(null, true);
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
