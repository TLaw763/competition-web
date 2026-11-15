"use client";

import { buttonVariants } from "../../components/ui/button";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { bffFetch } from "../../lib/bff-client";
import { eventHref, type LastEvent } from "../../lib/last-event";

/** A group's link (/<group>) opens its ongoing event, else its newest. */
export default function GroupRoute() {
  const { group } = useParams<{ group: string }>();
  const router = useRouter();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    void bffFetch<LastEvent>(`/v1/public/groups/by-slug/${encodeURIComponent(group)}`)
      .then((target) => router.replace(eventHref(target)))
      .catch(() => setMissing(true));
  }, [group, router]);

  if (!missing)
    return <p className="text-sm text-muted-foreground">Opening the event…</p>;
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Page not found
      </h1>
      <p className="text-sm text-muted-foreground">
        There&apos;s no event group at this link.
      </p>
      <Link
        href="/"
        className={buttonVariants({ className: "inline-block no-underline" })}
      >
        See all events
      </Link>
    </section>
  );
}
