"use client";

import { buttonVariants } from "./ui/button";

import { useEffect, useState } from "react";
import { bffFetch, errorMessage } from "../lib/bff-client";
import { EventCover, EventLogo } from "./event-branding";
import { useToast } from "./toast";

type Branding = { logoUrl: string | null; coverUrl: string | null };
type Draft = { logoUrl: string; coverUrl: string };

const toDraft = (b: Partial<Branding> | undefined): Draft => ({
  logoUrl: b?.logoUrl ?? "",
  coverUrl: b?.coverUrl ?? "",
});
const toBody = (d: Draft): Branding => ({
  logoUrl: d.logoUrl.trim() || null,
  coverUrl: d.coverUrl.trim() || null,
});
const looksOk = (url: string) => !url.trim() || url.trim().startsWith("https://");

function BrandingForm({
  title,
  hint,
  name,
  value,
  fallback,
  onChange,
  onSave,
  busy,
}: {
  title: string;
  hint: string;
  name: string;
  value: Draft;
  fallback?: Draft;
  onChange: (next: Draft) => void;
  onSave: () => void;
  busy: boolean;
}) {
  const shown = {
    logo: value.logoUrl.trim() || fallback?.logoUrl || null,
    cover: value.coverUrl.trim() || fallback?.coverUrl || null,
  };
  const valid = looksOk(value.logoUrl) && looksOk(value.coverUrl);
  return (
    <div className="rounded-lg border bg-muted/50 space-y-3 p-4 text-sm">
      <div>
        <h3 className="font-medium text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <EventCover url={shown.cover} className="h-20" />
        <div className="flex items-center gap-3 p-3">
          <div className="-mt-8">
            <EventLogo name={name} url={shown.logo} size="sm" />
          </div>
          <span className="font-medium text-foreground">{name}</span>
        </div>
      </div>
      <label className="flex flex-col gap-1 text-foreground">
        Logo link
        <input
          type="url"
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
          disabled={busy}
          placeholder="https://… (square works best)"
          value={value.logoUrl}
          onChange={(e) => onChange({ ...value, logoUrl: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-foreground">
        Cover image link
        <input
          type="url"
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
          disabled={busy}
          placeholder="https://… (wide, e.g. 1200×400)"
          value={value.coverUrl}
          onChange={(e) => onChange({ ...value, coverUrl: e.target.value })}
        />
      </label>
      {!valid ? (
        <p className="text-xs text-danger">Use links that start with https://</p>
      ) : null}
      <button
        type="button"
        className={buttonVariants()}
        disabled={busy || !valid}
        onClick={onSave}
      >
        Save
      </button>
    </div>
  );
}

/** Main organiser: the group's logo and cover, and optionally the event's own. */
export function BrandingPanel({
  groupId,
  groupName,
  seasonId,
  seasonName,
}: {
  groupId: string;
  groupName: string;
  seasonId: string | null;
  seasonName: string | null;
}) {
  const toast = useToast();
  const [group, setGroup] = useState<Draft>(toDraft(undefined));
  const [event, setEvent] = useState<Draft>(toDraft(undefined));
  const [busy, setBusy] = useState(false);
  // The fields wait for the saved links, so a slow load can't wipe what was typed.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let current = true;
    setLoaded(false);
    void Promise.all([
      bffFetch<Branding>(`/v1/competitions/${groupId}`),
      seasonId
        ? bffFetch<{ items: Array<Branding & { id: string }> }>(
            `/v1/competitions/${groupId}/seasons`,
          ).then((res) => res.items.find((s) => s.id === seasonId))
        : Promise.resolve(undefined),
    ])
      .then(([g, e]) => {
        if (!current) return;
        setGroup(toDraft(g));
        setEvent(toDraft(e));
        setLoaded(true);
      })
      .catch((e) => toast.error(errorMessage(e, "Couldn't load the images")));
    return () => {
      current = false;
    };
  }, [groupId, seasonId, toast]);

  async function save(path: string, draft: Draft, label: string) {
    setBusy(true);
    try {
      await bffFetch(path, { method: "PUT", body: JSON.stringify(toBody(draft)) });
      toast.success(`${label} saved.`);
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't save the images"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card text-card-foreground shadow-xs space-y-3 p-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Logo and cover</h2>
        <p className="text-sm text-muted-foreground">
          Shown on event cards, event pages and link previews. Paste links to images
          hosted elsewhere (https). Without a logo, the group&apos;s initials are shown.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <BrandingForm
          title={`Group: ${groupName}`}
          hint="Used by every event in the group."
          name={groupName}
          value={group}
          onChange={setGroup}
          busy={busy || !loaded}
          onSave={() =>
            void save(`/v1/competitions/${groupId}/branding`, group, "Group images")
          }
        />
        {seasonId && seasonName ? (
          <BrandingForm
            title={`This event: ${seasonName}`}
            hint="Optional: overrides the group's images for this event only. Leave empty to use the group's."
            name={groupName}
            value={event}
            fallback={group}
            onChange={setEvent}
            busy={busy || !loaded}
            onSave={() =>
              void save(`/v1/seasons/${seasonId}/branding`, event, "Event images")
            }
          />
        ) : null}
      </div>
    </section>
  );
}
