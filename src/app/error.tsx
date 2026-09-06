"use client";

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="glass max-w-md rounded-[28px] p-8 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button className="mt-4 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
