"use client";

import { buttonVariants } from "../../components/ui/button";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountPanel } from "../../components/account-panel";
import { useAuth } from "../../components/auth-provider";
import { PanelsSkeleton } from "../../components/skeleton";
import { signInHref } from "../../lib/auth";
import { bffFetch } from "../../lib/bff-client";
import { readLastEvent } from "../../lib/last-event";
import type { MyProfile } from "../../lib/types";

/**
 * A player's account lives on their player page (Account tab). This page
 * sends them there, or shows the account itself while they have no player
 * records yet.
 */
export default function AccountPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void bffFetch<MyProfile>("/v1/me/profile")
      .then((p) => {
        if (cancelled) return;
        const id = p.participantIds[0];
        if (!id) return setStandalone(true);
        const seasonId = readLastEvent()?.seasonId;
        const qs = new URLSearchParams();
        if (seasonId) qs.set("seasonId", seasonId);
        qs.set("tab", "account");
        router.replace(`/players/${id}?${qs}`);
      })
      .catch(() => !cancelled && setStandalone(true));
    return () => {
      cancelled = true;
    };
  }, [session, router]);

  if (loading || (session && !standalone)) {
    return <PanelsSkeleton label="Loading account…" />;
  }

  if (!session) {
    return (
      <section className="space-y-3">
        <p className="text-sm text-muted-foreground">Sign in to manage your account.</p>
        <Link
          href={signInHref("/account")}
          className={buttonVariants({ className: "inline-block no-underline" })}
        >
          Sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Account</h1>
        <p className="text-sm text-muted-foreground">{session.displayName}</p>
      </div>
      <AccountPanel />
    </section>
  );
}
