import { cn } from "@enigmic-co/ui/cn";
import { Suspense } from "react";
import { HomeEvents } from "../components/home-events";
import { CardsSkeleton } from "../components/skeleton";
import { DEV_TOOLS } from "../lib/dev-tools";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  // Authentik's account deletion comes back here (?account=deleted).
  const { account } = await searchParams;
  return (
    <section className="space-y-8">
      {account === "deleted" ? (
        <p
          className={cn(
            "rounded-md border border-info/35 bg-info-soft p-3 text-foreground",
            "text-sm",
          )}
          role="status"
        >
          Your Enigmic account has been deleted.
        </p>
      ) : null}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Enigmic League
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground leading-relaxed">
          Leagues and tournaments: tables, fixtures and results for every event.
        </p>
      </div>

      <Suspense fallback={<CardsSkeleton />}>
        <HomeEvents />
      </Suspense>

      {DEV_TOOLS ? <DevIdentities /> : null}
    </section>
  );
}

function DevIdentities() {
  return (
    <aside className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
      <h2 className="font-semibold text-foreground">Dev identities</h2>
      <p className="mt-1">
        Sign in as one on the login page (quick sign-in), or use one as the Authorization
        token in API calls.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 font-mono text-xs text-foreground">
        <li>admin@dev.enigmic.invalid</li>
        <li>organizer@dev.enigmic.invalid</li>
        <li>alice@dev.enigmic.invalid</li>
        <li>bob@dev.enigmic.invalid</li>
      </ul>
      <p className="mt-3 text-xs">
        API: <code>http://localhost:4000</code> · Web: <code>http://localhost:3001</code>
      </p>
    </aside>
  );
}
