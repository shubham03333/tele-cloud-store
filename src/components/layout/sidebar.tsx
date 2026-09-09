"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Cloud, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MOBILE_MORE_HREFS, MOBILE_TAB_HREFS, NAV_ITEMS } from "@/lib/nav";
import { BottomSheet } from "@/components/ui/bottom-sheet";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass sticky top-4 hidden h-[calc(100dvh-2rem)] w-64 shrink-0 flex-col rounded-[28px] p-4 lg:flex">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Cloud className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">Nimbus Drive</p>
          <p className="text-xs text-muted-foreground">Personal cloud</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="relative" aria-current={active ? "page" : undefined}>
              {active ? (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-2xl bg-accent"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm",
                  active ? "text-accent-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MOBILE_MORE_HREFS.some((href) => pathname === href);

  const tabs = NAV_ITEMS.filter((item) => MOBILE_TAB_HREFS.includes(item.href as (typeof MOBILE_TAB_HREFS)[number]));
  const moreItems = NAV_ITEMS.filter((item) => MOBILE_MORE_HREFS.includes(item.href as (typeof MOBILE_MORE_HREFS)[number]));

  return (
    <>
      <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-border lg:hidden">
        <div className="grid grid-cols-5 px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "scale-105")} />
                {item.shortLabel}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium",
              moreActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <LayoutGrid className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>
      <BottomSheet open={moreOpen} title="Library" onClose={() => setMoreOpen(false)}>
        <div className="grid grid-cols-3 gap-2">
          {moreItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-muted/70 px-2 text-center text-xs font-medium",
                  active && "bg-accent text-accent-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
