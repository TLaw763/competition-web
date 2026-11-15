/** Grey placeholder blocks while a page loads; screen readers hear the label instead. */
export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

function Loading({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** A heading and a few panels: the organiser board, account pages. */
export function PanelsSkeleton({
  label = "Loading…",
  panels = 3,
}: {
  label?: string;
  panels?: number;
}) {
  return (
    <Loading label={label}>
      <Skeleton className="h-10 w-full max-w-md" />
      {Array.from({ length: panels }, (_, i) => (
        <div
          key={i}
          className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5"
        >
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}
    </Loading>
  );
}

/** Event cards (home page). */
export function CardsSkeleton({
  label = "Loading events…",
  cards = 2,
}: {
  label?: string;
  cards?: number;
}) {
  return (
    <Loading label={label}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: cards }, (_, i) => (
          <li
            key={i}
            className="rounded-xl border bg-card text-card-foreground shadow-xs overflow-hidden"
          >
            <Skeleton className="h-24 w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </li>
        ))}
      </ul>
    </Loading>
  );
}

/** An event page: header, tabs and a table. */
export function EventSkeleton() {
  return (
    <Loading label="Loading event…">
      <div className="rounded-xl border bg-card text-card-foreground shadow-xs overflow-hidden">
        <Skeleton className="h-28 w-full rounded-none sm:h-40" />
        <div className="flex items-center gap-4 p-5">
          <Skeleton className="h-16 w-16" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-6 w-1/3" />
          </div>
        </div>
      </div>
      <Skeleton className="h-8 w-64" />
      <div className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </Loading>
  );
}

/** Match cards (My fixtures). */
export function FixturesSkeleton({
  label = "Loading your fixtures…",
}: {
  label?: string;
}) {
  return (
    <Loading label={label}>
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: 2 }, (_, i) => (
        <div
          key={i}
          className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-9 w-40" />
        </div>
      ))}
    </Loading>
  );
}
