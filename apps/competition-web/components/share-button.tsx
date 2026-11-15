"use client";

import { buttonVariants } from "./ui/button";

import { useToast } from "./toast";

/**
 * The phone's share sheet where there is one (WhatsApp, Discord…), otherwise
 * the link is copied.
 */
export function ShareButton({ title, path }: { title: string; path: string }) {
  const toast = useToast();

  async function share() {
    const url = new URL(path, window.location.origin).toString();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        // Closing the share sheet isn't an error.
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied.");
    } catch {
      toast.info(`Copy this link: ${url}`);
    }
  }

  return (
    <button
      type="button"
      className={buttonVariants({ variant: "outline" })}
      onClick={() => void share()}
    >
      Share
    </button>
  );
}
