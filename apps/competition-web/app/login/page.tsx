"use client";

import { buttonVariants } from "../../components/ui/button";
import { cn } from "@enigmic-co/ui/cn";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "../../components/auth-provider";
import { DEFAULT_DEV_PASSWORD } from "../../lib/dev-credentials";
import { DEV_TOOLS } from "../../lib/dev-tools";
import { authHref, safeRedirectPath } from "../../lib/auth-redirect";

const DEV_ACCOUNTS = [
  { label: "Platform admin", email: "admin@dev.enigmic.invalid" },
  { label: "Organizer", email: "organizer@dev.enigmic.invalid" },
  { label: "Alice", email: "alice@dev.enigmic.invalid" },
  { label: "Bob", email: "bob@dev.enigmic.invalid" },
];

function LoginForm() {
  const { login, session } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeRedirectPath(params.get("next"));
  const presetEmail = params.get("email") ?? "";

  const [email, setEmail] = useState(presetEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in: on to where they were going (after render, not during it).
  useEffect(() => {
    if (session) router.replace(next);
  }, [session, next, router]);
  if (session) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function quickLogin(accountEmail: string) {
    setBusy(true);
    setError(null);
    try {
      await login(accountEmail, DEFAULT_DEV_PASSWORD);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form
        onSubmit={(e) => void submit(e)}
        className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-4 p-5"
      >
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Email
          <input
            type="email"
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Password
          <input
            type="password"
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? (
          <p
            className={cn(
              "rounded-md border border-danger/35 bg-danger-soft p-3 text-danger",
              "text-sm",
            )}
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          className={buttonVariants({ className: "w-full" })}
          disabled={busy}
        >
          Sign in
        </button>
      </form>

      <p className="text-sm text-muted-foreground">
        New here?{" "}
        <Link href={authHref("/signup", next)} className="font-medium">
          Create an account
        </Link>
      </p>

      {DEV_TOOLS ? (
        <div className="rounded-lg border bg-muted/50 space-y-3 p-4 text-sm">
          <p className="font-medium text-foreground">Dev quick sign-in</p>
          <p className="text-muted-foreground">
            Seeded accounts use password <code>{DEFAULT_DEV_PASSWORD}</code>.
          </p>
          <div className="flex flex-wrap gap-2">
            {DEV_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className={buttonVariants({ variant: "outline" })}
                disabled={busy}
                onClick={() => void quickLogin(account.email)}
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to manage fixtures, accept invitations, or run your league.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <LoginForm />
      </Suspense>

      <p className="text-sm text-muted-foreground">
        <Link href="/" className="font-medium">
          ← Back to home
        </Link>
      </p>
    </section>
  );
}
