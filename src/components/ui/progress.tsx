import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-primary/10 ring-1 ring-primary/10", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary/70 via-primary to-primary/70 shadow-[0_0_12px_rgba(14,165,233,0.35)] transition-[width] duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
