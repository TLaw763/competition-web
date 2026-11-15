"use client";

import { buttonVariants } from "../../components/ui/button";
import { cn } from "@enigmic-co/ui/cn";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "../../components/auth-provider";
import { signInHref } from "../../lib/auth";
import { authHref } from "../../lib/auth-redirect";
import { bffFetch } from "../../lib/bff-client";

type InvitationPreview = {
  email: string;
  displayName: string;
  seasonName: string;
  competitionName: string;
  role: string;
  expired: boolean;
  accepted: boolean;
  /** Lets them sign up while sign-up is closed (invite-only). */
  signupToken?: string | null;
};

function InviteAcceptForm() {
  const { session, provider, loading, register, login, refresh, logout } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const inviteNext = token ? `/invite?token=${encodeURIComponent(token)}` : "/invite";

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    void bffFetch<InvitationPreview>(
      `/v1/public/invitations/preview?token=${encodeURIComponent(token)}`,
    )
      .then((data) => {
        setPreview(data);
        setDisplayName(data.displayName);
      })
      .catch((e) =>
        setPreviewError(e instanceof Error ? e.message : "Could not load invitation"),
      );
  }, [token]);

  async function acceptInvitation() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await bffFetch("/v1/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      router.push("/my-fixtures");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to accept invitation");
    } finally {
      setBusy(false);
    }
  }

  async function signUpAndAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      await register(preview.email, password, displayName);
      await bffFetch("/v1/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      router.push("/my-fixtures");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  async function signInAndAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      await login(preview.email, password);
      await refresh();
      await bffFetch("/v1/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      router.push("/my-fixtures");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-muted-foreground">
        Missing invitation token. Ask your organizer for a valid invite link.
      </p>
    );
  }

  if (previewError) {
    return (
      <p
        className={cn(
          "rounded-md border border-danger/35 bg-danger-soft p-3 text-danger",
          "text-sm",
        )}
      >
        {previewError}
      </p>
    );
  }

  if (!preview) {
    return <p className="text-sm text-muted-foreground">Loading invitation…</p>;
  }

  if (preview.accepted) {
    return (
      <div className="rounded-lg border bg-muted/50 space-y-2 p-4 text-sm">
        <p>This invitation was already accepted.</p>
        <Link
          href="/my-fixtures"
          className={buttonVariants({ className: "inline-block no-underline" })}
        >
          Go to my fixtures
        </Link>
      </div>
    );
  }

  if (preview.expired) {
    return (
      <p
        className={cn(
          "rounded-md border border-danger/35 bg-danger-soft p-3 text-danger",
          "text-sm",
        )}
      >
        This invitation has expired. Ask the organizer to send a new one.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading session…</p>;
  }

  if (session && session.email.toLowerCase() === preview.email.toLowerCase()) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Signed in as <strong>{session.email}</strong>. Join{" "}
          <strong>
            {preview.competitionName} · {preview.seasonName}
          </strong>
          ?
        </p>
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
          type="button"
          className={buttonVariants()}
          disabled={busy}
          onClick={() => void acceptInvitation()}
        >
          Accept invitation
        </button>
      </div>
    );
  }

  if (
    provider === "authentik" &&
    session &&
    session.email.toLowerCase() !== preview.email.toLowerCase()
  ) {
    return (
      <div className="rounded-lg border bg-muted/50 space-y-2 p-4 text-sm">
        <p>
          You are signed in as <strong>{session.email}</strong>, but this invitation is
          for <strong>{preview.email}</strong>.
        </p>
        <p>
          Sign out, then open the invitation link again and sign in or create an account
          with {preview.email}.
        </p>
        <button
          type="button"
          className={buttonVariants({ variant: "outline" })}
          onClick={() => void logout()}
        >
          Sign out
        </button>
      </div>
    );
  }

  if (provider === "authentik" && !session) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/50 p-4 text-sm">
          <p className="font-medium text-foreground">
            {preview.competitionName} · {preview.seasonName}
          </p>
          <p className="text-muted-foreground">
            You&apos;re invited as <strong>{preview.displayName}</strong> ({preview.role}
            ).
          </p>
          <p className="text-muted-foreground">
            Use <strong>{preview.email}</strong> to create your Enigmic account or sign
            in. You&apos;ll come back here to join.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={signInHref(inviteNext, "signup", { invitation: preview.signupToken })}
            className={buttonVariants({ className: "no-underline" })}
          >
            Create account
          </a>
          <a
            href={signInHref(inviteNext)}
            className={buttonVariants({ variant: "outline", className: "no-underline" })}
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

  if (session && session.email.toLowerCase() !== preview.email.toLowerCase()) {
    return (
      <div className="rounded-lg border bg-muted/50 space-y-2 p-4 text-sm">
        <p>
          You are signed in as <strong>{session.email}</strong>, but this invitation is
          for <strong>{preview.email}</strong>.
        </p>
        <p>Sign out and create an account or sign in with the invited email.</p>
        <Link
          href={authHref("/signup", inviteNext, {
            email: preview.email,
            name: preview.displayName,
          })}
          className={buttonVariants({ className: "inline-block no-underline" })}
        >
          Create account for {preview.email}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/50 p-4 text-sm">
        <p className="font-medium text-foreground">
          {preview.competitionName} · {preview.seasonName}
        </p>
        <p className="text-muted-foreground">
          You&apos;re invited as <strong>{preview.displayName}</strong> ({preview.role}).
        </p>
        <p className="text-muted-foreground">
          Use <strong>{preview.email}</strong> to create your account or sign in.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className={buttonVariants({
            variant: mode === "signup" ? "default" : "outline",
          })}
          onClick={() => setMode("signup")}
        >
          Create account
        </button>
        <button
          type="button"
          className={buttonVariants({
            variant: mode === "signin" ? "default" : "outline",
          })}
          onClick={() => setMode("signin")}
        >
          Sign in
        </button>
      </div>

      {mode === "signup" ? (
        <form
          onSubmit={(e) => void signUpAndAccept(e)}
          className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-4 p-5"
        >
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Email
            <input
              type="email"
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              value={preview.email}
              readOnly
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Display name
            <input
              type="text"
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
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
            Create account and join
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => void signInAndAccept(e)}
          className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-4 p-5"
        >
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Email
            <input
              type="email"
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              value={preview.email}
              readOnly
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
            Sign in and join
          </button>
        </form>
      )}
    </div>
  );
}

export default function InvitePage() {
  return (
    <section className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Season invitation
        </h1>
        <p className="text-sm text-muted-foreground">
          Create an account or sign in with the invited email to join the league.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <InviteAcceptForm />
      </Suspense>
    </section>
  );
}
