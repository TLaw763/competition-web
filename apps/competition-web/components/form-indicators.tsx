type FormResult = "W" | "D" | "L";

const RESULT_STYLES: Record<FormResult, string> = {
  W: "bg-success-soft text-success",
  D: "bg-warning-soft text-warning",
  L: "bg-danger-soft text-danger",
};

const RESULT_LABELS: Record<FormResult, string> = {
  W: "Win",
  D: "Draw",
  L: "Loss",
};

export function FormIndicators({
  results,
  chronological = true,
}: {
  results: FormResult[];
  chronological?: boolean;
}) {
  if (results.length === 0) {
    return <span className="text-xs text-muted-foreground">No form</span>;
  }

  const displayed = chronological ? [...results].reverse() : results;
  return (
    <div className="flex items-center gap-1" aria-label="Recent form">
      {displayed.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={`inline-flex size-6 items-center justify-center rounded-full text-[11px] font-semibold ${RESULT_STYLES[result]}`}
          aria-label={RESULT_LABELS[result]}
          title={RESULT_LABELS[result]}
        >
          {result}
        </span>
      ))}
    </div>
  );
}
