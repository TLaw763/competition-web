export function MatchProgressBar({
  played,
  total,
  compact = false,
}: {
  played: number;
  total: number;
  compact?: boolean;
}) {
  const percentage = total === 0 ? 0 : Math.min(100, (played / total) * 100);

  return (
    <div
      className="flex items-center gap-2"
      aria-label={`${played} of ${total} matches played`}
    >
      <div
        className={`${compact ? "w-20" : "w-28"} h-1.5 overflow-hidden rounded-full bg-muted`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={played}
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
        {played}/{total}
      </span>
    </div>
  );
}
