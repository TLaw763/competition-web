import { buttonVariants } from "../../components/ui/button";
import { cn } from "@enigmic-co/ui/cn";
import Link from "next/link";

export const dynamic = "force-dynamic";

/** Where sign-in ends when Authentik or the code exchange refuses it. */
export default async function LoginFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <section className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Sign-in didn&apos;t work
      </h1>
      <p
        className={cn(
          "rounded-md border border-danger/35 bg-danger-soft p-3 text-danger",
          "text-sm",
        )}
        role="alert"
      >
        {error?.slice(0, 300) || "Sign-in failed. Try again."}
      </p>
      <div className="flex gap-2">
        <a
          href="/api/auth/login"
          className={buttonVariants({ className: "no-underline" })}
        >
          Try again
        </a>
        <Link
          href="/"
          className={buttonVariants({ variant: "outline", className: "no-underline" })}
        >
          Home
        </Link>
      </div>
    </section>
  );
}
