export default function Loading() {
  return (
    <div className="min-h-dvh p-6">
      <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
        <div className="glass h-40 animate-pulse rounded-[28px]" />
        <div className="glass h-40 animate-pulse rounded-[28px]" />
        <div className="glass h-40 animate-pulse rounded-[28px]" />
      </div>
    </div>
  );
}
