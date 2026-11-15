"use client";

import { buttonVariants } from "./ui/button";

import { useEffect, useState } from "react";
import { bffFetch, errorMessage } from "../lib/bff-client";
import { formatMasterDuelId, isMasterDuelIdInput } from "../lib/games";
import type { MyProfile } from "../lib/types";
import { useAuth } from "./auth-provider";
import { useToast } from "./toast";

/**
 * The player's own name, Master Duel username, Master Duel ID and KONAMI ID.
 * The name and username show on every event's table and fixtures; the Master
 * Duel ID only to your opponents and organisers; the KONAMI ID only to you and
 * your events' organisers.
 */
export function PlayerDetailsPanel({ onSaved }: { onSaved?: (p: MyProfile) => void }) {
  const { refresh } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [duelId, setDuelId] = useState("");
  const [konamiId, setKonamiId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void bffFetch<MyProfile>("/v1/me/profile")
      .then((p) => {
        setProfile(p);
        setName(p.displayName);
        setUsername(p.onlineClientUsername ?? "");
        setDuelId(formatMasterDuelId(p.masterDuelId));
        setKonamiId(p.konamiId ?? "");
      })
      .catch((e) => setError(errorMessage(e, "Couldn't load your details")));
  }, []);

  const konamiValid = konamiId.trim() === "" || /^\d{10}$/.test(konamiId.trim());
  const duelIdValid = isMasterDuelIdInput(duelId);
  const duelIdDigits = duelId.replace(/[\s-]/g, "");
  const valid = konamiValid && duelIdValid;
  const changed =
    profile !== null &&
    (name.trim() !== profile.displayName ||
      username.trim() !== (profile.onlineClientUsername ?? "") ||
      duelIdDigits !== (profile.masterDuelId ?? "") ||
      konamiId.trim() !== (profile.konamiId ?? ""));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const next = await bffFetch<MyProfile>("/v1/me/profile", {
        method: "PUT",
        body: JSON.stringify({
          displayName: name.trim(),
          onlineClientUsername: username.trim() || null,
          masterDuelId: duelIdDigits || null,
          konamiId: konamiId.trim() || null,
        }),
      });
      setProfile(next);
      setName(next.displayName);
      setUsername(next.onlineClientUsername ?? "");
      setDuelId(formatMasterDuelId(next.masterDuelId));
      setKonamiId(next.konamiId ?? "");
      toast.success("Your details are saved.");
      onSaved?.(next);
      // The header's name comes from the session.
      await refresh();
    } catch (e) {
      setError(errorMessage(e, "Couldn't save your details"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-4 p-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Player details</h2>
        <p className="text-sm text-muted-foreground">
          Your name and Master Duel username show on every event&apos;s table and
          fixtures. Your Master Duel ID is only shown to the players you&apos;re drawn
          against (so you can add each other) and your events&apos; organisers. Your
          KONAMI ID is only seen by you and your events&apos; organisers.
        </p>
      </div>
      {!profile && !error ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (changed && valid && name.trim()) void save();
          }}
        >
          <label className="flex flex-col gap-1 text-sm text-foreground sm:col-span-2">
            Display name
            <input
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              value={name}
              maxLength={100}
              required
              autoComplete="nickname"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Master Duel username
            <input
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              value={username}
              maxLength={64}
              placeholder="Your in-game name"
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Master Duel ID
            <input
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              value={duelId}
              inputMode="numeric"
              maxLength={11}
              placeholder="e.g. 123-456-789"
              aria-invalid={!duelIdValid}
              aria-describedby="duel-id-hint"
              onChange={(e) => setDuelId(e.target.value)}
            />
            <span
              id="duel-id-hint"
              className={`text-xs ${duelIdValid ? "text-muted-foreground" : "text-danger"}`}
            >
              {duelIdValid
                ? "Your 9-digit player ID (Profile in Master Duel). Optional."
                : "A Master Duel ID is 9 digits."}
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            KONAMI ID
            <input
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              value={konamiId}
              inputMode="numeric"
              maxLength={10}
              placeholder="10 digits"
              aria-invalid={!konamiValid}
              aria-describedby="konami-hint"
              onChange={(e) => setKonamiId(e.target.value.replace(/\s/g, ""))}
            />
            <span
              id="konami-hint"
              className={`text-xs ${konamiValid ? "text-muted-foreground" : "text-danger"}`}
            >
              {konamiValid
                ? "For official TCG events. Optional."
                : "A KONAMI ID is 10 digits."}
            </span>
          </label>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              className={buttonVariants()}
              disabled={busy || !changed || !valid || !name.trim()}
            >
              Save details
            </button>
            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}
