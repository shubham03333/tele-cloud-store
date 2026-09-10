import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { UploaderProvider } from "@/hooks/use-uploader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UploaderProvider>
      <div className="min-h-dvh min-w-0 overflow-x-hidden px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:px-5 md:px-6 md:pt-5 lg:pb-5">
        <div className="mx-auto flex max-w-[1440px] gap-5 lg:gap-6">
          <Sidebar />
          <main className="min-w-0 flex-1 lg:pt-1">{children}</main>
        </div>
        <MobileNav />
      </div>
    </UploaderProvider>
  );
}
