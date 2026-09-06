export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="glass rounded-[28px] p-8 text-center">
        <h1 className="text-xl font-semibold">Not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">That page is not in Nimbus Drive.</p>
      </div>
    </div>
  );
}
