import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-12 w-full rounded-2xl border border-border bg-input px-4 text-base outline-none transition focus:ring-2 focus:ring-ring md:h-11 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
