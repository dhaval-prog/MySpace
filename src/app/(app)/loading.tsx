export default function AppLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-9 w-64 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
