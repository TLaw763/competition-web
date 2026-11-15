import type { Metadata } from "next";
import { Suspense } from "react";
import { EventPage } from "../../../components/event-page";
import { EventSkeleton } from "../../../components/skeleton";
import { apiFetch } from "../../../lib/api";
import type { EventPageData } from "../../../lib/types";

type Params = Promise<{ group: string; season: string }>;

/** Link previews (WhatsApp, Discord…) for public events; private ones stay generic. */
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { group, season } = await params;
  try {
    const page = await apiFetch<EventPageData>(
      `/v1/public/events/by-slug/${encodeURIComponent(group)}/${encodeURIComponent(season)}`,
    );
    const title = `${page.event.name} · ${page.group.name}`;
    const description =
      page.group.description ??
      `Standings, fixtures and results for ${page.event.name} (${page.group.name}).`;
    const image = page.event.coverUrl ?? page.event.logoUrl;
    return {
      title,
      description,
      openGraph: { title, description, ...(image ? { images: [image] } : {}) },
    };
  } catch {
    return { title: "Event · Enigmic League" };
  }
}

export default async function EventRoute({ params }: { params: Params }) {
  const { group, season } = await params;
  return (
    <Suspense fallback={<EventSkeleton />}>
      <EventPage groupSlug={group.toLowerCase()} seasonSlug={season.toLowerCase()} />
    </Suspense>
  );
}
