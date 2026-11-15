"use client";

import { buttonVariants } from "./ui/button";
import { cn } from "@enigmic-co/ui/cn";

import { useEffect, useState } from "react";
import { bffFetch, errorMessage, formatDateTime } from "../lib/bff-client";

type Issue = { row: number; message: string };

type ImportPreview = {
  previewToken: string;
  source: "csv" | "mdleague";
  newPlayers: Array<{ name: string; username: string | null }>;
  newRounds: number[];
  newFixtures: number;
  updatedFixtures: number;
  results: number;
  times: number;
  unchanged: number;
  fixtures: Array<{
    row: number;
    round: number;
    playerA: string;
    playerB: string;
    existing: boolean;
    result: { gamesA: number; gamesB: number; doubleLoss?: boolean } | null;
    startAt: string | null;
  }>;
  conflicts: Issue[];
  flagged: Issue[];
  skipped: Issue[];
};

type ImportDone = { fixtureIds: string[]; players: number; failed: Issue[] };

export const CSV_TEMPLATE =
  "round,player_a,player_b,score_a,score_b,scheduled_at\n1,Alice,Bob,2,1,2026-11-03 18:00\n1,Cara,Dan,,,\n";

function IssueList({
  title,
  items,
  tone,
}: {
  title: string;
  items: Issue[];
  tone: string;
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-1">
      <p className={`font-medium ${tone}`}>
        {title} ({items.length})
      </p>
      <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
        {items.map((issue, i) => (
          <li key={`${issue.row}-${i}`}>
            {issue.row > 0 ? `Row ${issue.row}: ` : ""}
            {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Platform admin: bring a league's fixtures and results in from a CSV or from
 * md-league. Re-running it adds only what's new; a different result already
 * here is reported, never overwritten.
 */
export function ImportPanel({
  seasonId,
  timezone,
  onImported,
}: {
  seasonId: string;
  timezone: string;
  onImported: (message: string) => Promise<void> | void;
}) {
  const [status, setStatus] = useState<{ mdLeague: boolean; imported: number } | null>(
    null,
  );
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The wizard's "Import" league option lands here.
  useEffect(() => {
    if (window.location.hash === "#import") {
      document.getElementById("import")?.scrollIntoView({ block: "start" });
    }
  }, []);

  useEffect(() => {
    setPreview(null);
    setError(null);
    void bffFetch<{ mdLeague: boolean; imported: number }>(
      `/v1/seasons/${seasonId}/import`,
    )
      .then(setStatus)
      .catch((e) => setError(errorMessage(e, "Couldn't load the import")));
  }, [seasonId]);

  async function runPreview(
    body: { source: "csv"; csv: string } | { source: "mdleague" },
  ) {
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      setPreview(
        await bffFetch<ImportPreview>(`/v1/seasons/${seasonId}/import/preview`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    } catch (e) {
      setError(errorMessage(e, "Couldn't read the import"));
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const done = await bffFetch<ImportDone>(`/v1/seasons/${seasonId}/import`, {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ previewToken: preview.previewToken }),
      });
      setPreview(null);
      setStatus((s) => (s ? { ...s, imported: s.imported + done.fixtureIds.length } : s));
      const failed = done.failed.length
        ? ` ${done.failed.length} result(s) couldn't be entered.`
        : "";
      await onImported(
        `Imported: ${done.fixtureIds.length} match(es) added or updated, ${done.players} new player(s).${failed}`,
      );
    } catch (e) {
      setError(errorMessage(e, "The import failed"));
    } finally {
      setBusy(false);
    }
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    setCsv(await file.text());
    setPreview(null);
  }

  const nothingToDo =
    preview && preview.fixtures.length === 0 && preview.newPlayers.length === 0;

  return (
    <section
      id="import"
      className="rounded-xl border bg-card text-card-foreground shadow-xs scroll-mt-20 space-y-4 p-5"
      aria-labelledby="import-heading"
    >
      <div>
        <h2 id="import-heading" className="text-lg font-semibold text-foreground">
          Import fixtures &amp; results
        </h2>
        <p className="text-sm text-muted-foreground">
          Platform admin only. Bring a league in from a CSV
          {status?.mdLeague ? " or from md-league" : ""}. Run it again any time to pick up
          new results: nothing is added twice, and a result that&apos;s already here is
          never overwritten. Draws come in without a result, for you to enter the winner.
          {status?.imported
            ? ` ${status.imported} match(es) here came from an import.`
            : ""}
        </p>
      </div>

      {status?.mdLeague ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={buttonVariants()}
            disabled={busy}
            onClick={() => void runPreview({ source: "mdleague" })}
          >
            {busy ? "Reading…" : "Fetch from md-league"}
          </button>
          <span className="text-xs text-muted-foreground">
            Reads md-league&apos;s fixtures; changes nothing there.
          </span>
        </div>
      ) : null}

      <details
        className="rounded-lg border bg-muted/50 p-3 text-sm"
        open={!status?.mdLeague && !status?.imported}
      >
        <summary className="cursor-pointer font-medium text-foreground">
          From a CSV
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-muted-foreground">
            A header row, then one match per row. Needed: <code>round</code>,{" "}
            <code>player_a</code>, <code>player_b</code>. Optional: <code>score_a</code>,{" "}
            <code>score_b</code> (games won), <code>scheduled_at</code> (e.g. 2026-11-03
            18:00, in {timezone}), <code>external_id</code>,{" "}
            <code>player_a_username</code>, <code>player_b_username</code>,{" "}
            <code>outcome</code> (<code>double_loss</code> when both players lost: 0–0, no
            points).
          </p>
          <label className="flex flex-col gap-1 text-foreground">
            Paste the CSV
            <textarea
              className={cn(
                "min-h-16 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
                "min-h-32 font-mono text-xs",
              )}
              value={csv}
              placeholder={CSV_TEMPLATE}
              onChange={(e) => {
                setCsv(e.target.value);
                setPreview(null);
              }}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <label
              className={buttonVariants({
                variant: "outline",
                className: "cursor-pointer",
              })}
            >
              Upload a .csv
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => void readFile(e.target.files?.[0])}
              />
            </label>
            <a
              className={buttonVariants({ variant: "outline" })}
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`}
              download="league-import-template.csv"
            >
              Download a template
            </a>
            <button
              type="button"
              className={buttonVariants()}
              disabled={busy || !csv.trim()}
              onClick={() => void runPreview({ source: "csv", csv })}
            >
              {busy ? "Reading…" : "Preview import"}
            </button>
          </div>
        </div>
      </details>

      {error ? (
        <p
          className="rounded-md border border-danger/35 bg-danger-soft p-3 text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {preview ? (
        <div
          className="rounded-lg border bg-muted/50 space-y-3 p-3 text-sm"
          aria-live="polite"
        >
          <p className="font-medium text-foreground">
            {nothingToDo
              ? `Nothing new to import (${preview.unchanged} match(es) already up to date).`
              : `Preview: ${preview.newFixtures} new match(es), ${preview.results} result(s), ${preview.times} time(s), ${preview.newPlayers.length} new player(s)${
                  preview.newRounds.length
                    ? `, new rounds ${preview.newRounds.join(", ")}`
                    : ""
                }. ${preview.unchanged} already up to date.`}
          </p>
          {preview.newPlayers.length ? (
            <p className="text-muted-foreground">
              New roster-only players: {preview.newPlayers.map((p) => p.name).join(", ")}
            </p>
          ) : null}
          <IssueList
            title="Different result already here (not changed)"
            items={preview.conflicts}
            tone="text-warning"
          />
          <IssueList
            title="Coming in without a result"
            items={preview.flagged}
            tone="text-warning"
          />
          <IssueList title="Skipped" items={preview.skipped} tone="text-danger" />
          {preview.fixtures.length ? (
            <div className="max-h-72 overflow-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-card text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1">Round</th>
                    <th className="px-2 py-1">Match</th>
                    <th className="px-2 py-1">Result</th>
                    <th className="px-2 py-1">Time</th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.fixtures.map((f) => (
                    <tr key={f.row}>
                      <td className="px-2 py-1">{f.round}</td>
                      <td className="px-2 py-1">
                        {f.playerA} vs {f.playerB}
                      </td>
                      <td className="px-2 py-1">
                        {f.result
                          ? f.result.doubleLoss
                            ? "0–0 double loss"
                            : `${f.result.gamesA}–${f.result.gamesB}`
                          : "—"}
                      </td>
                      <td className="px-2 py-1">
                        {f.startAt ? formatDateTime(f.startAt, timezone) : "—"}
                      </td>
                      <td className="px-2 py-1 text-muted-foreground">
                        {f.existing ? "update" : "new"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {!nothingToDo ? (
              <button
                type="button"
                className={buttonVariants()}
                disabled={busy}
                onClick={() => void commit()}
              >
                {busy ? "Importing…" : "Import"}
              </button>
            ) : null}
            <button
              type="button"
              className={buttonVariants({ variant: "outline" })}
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              {nothingToDo ? "Close" : "Cancel"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
