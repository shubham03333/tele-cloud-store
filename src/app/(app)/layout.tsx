import { Sidebar, MobileNav } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:px-4 md:pt-4 lg:pb-4">
      <div className="mx-auto flex max-w-[1400px] gap-4">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
