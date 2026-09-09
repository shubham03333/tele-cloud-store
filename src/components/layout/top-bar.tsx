"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function TopBar({ title }: { title: string }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const timeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeout.current) {
        window.clearTimeout(timeout.current);
      }
    };
  }, []);

  return (
    <header className="mb-5 md:mb-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="hidden text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:block">Nimbus Drive</p>
          <h1 className="truncate text-2xl font-semibold leading-tight sm:text-3xl">{title}</h1>
        </div>
        <div className="shrink-0">
          <ThemeToggle />
        </div>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          inputMode="search"
          enterKeyHint="search"
          placeholder="Search your cloud"
          className="h-12 rounded-2xl border-white/60 bg-white/70 pl-10 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
          onChange={(event) => {
            setQuery(event.target.value);
            if (timeout.current) {
              window.clearTimeout(timeout.current);
            }
            timeout.current = window.setTimeout(() => {
              if (event.target.value.trim()) {
                router.push(`/files?q=${encodeURIComponent(event.target.value.trim())}`);
              }
            }, 300);
          }}
        />
      </div>
    </header>
  );
}
