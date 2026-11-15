export function safeRedirectPath(
  next: string | null | undefined,
  fallback = "/my-fixtures",
): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }
  return next;
}

export function authHref(
  path: "/login" | "/signup",
  next?: string | null,
  extras?: { email?: string; name?: string },
): string {
  const params = new URLSearchParams();
  if (next) params.set("next", next);
  if (extras?.email) params.set("email", extras.email);
  if (extras?.name) params.set("name", extras.name);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
