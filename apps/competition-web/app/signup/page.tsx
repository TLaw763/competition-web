"use client";

import { buttonVariants } from "../../components/ui/button";
import { cn } from "@enigmic-co/ui/cn";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "../../components/auth-provider";
import { authHref, safeRedirectPath } from "../../lib/auth-redirect";

function SignUpForm() {
  const { register, session } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeRedirectPath(params.get("next"));
  const presetEmail = params.get("email") ?? "";
  const presetName = params.get("name") ?? "";

  const [email, setEmail] = useState(presetEmail);
  const [displayName, setDisplayName] = useState(presetName);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) {
    router.replace(next);
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(email, password, displayName);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
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
            readOnly={!!presetEmail}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Display name
          <input
            type="text"
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Password
          <input
            type="password"
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span className="text-xs text-muted-foreground">At least 8 characters</span>
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
          Create account
        </button>
      </form>

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={authHref("/login", next)} className="font-medium">
          Sign in
        </Link>
      </p>
    </>
  );
}

export default function SignUpPage() {
  return (
    <section className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create account
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign up to join leagues, accept invitations, and manage your fixtures.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <SignUpForm />
      </Suspense>

      <p className="text-sm text-muted-foreground">
        <Link href="/" className="font-medium">
          ← Back to home
        </Link>
      </p>
    </section>
  );
}
