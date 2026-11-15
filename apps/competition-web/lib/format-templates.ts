export type FormatTemplateId = "league" | "swiss" | "bracket" | "hybrid_swiss_cut";

export type FormatTemplateOption = {
  id: FormatTemplateId;
  title: string;
  summary: string;
  detail: string;
};

export const FORMAT_TEMPLATE_OPTIONS: FormatTemplateOption[] = [
  {
    id: "league",
    title: "League",
    summary: "Round-robin — everyone plays everyone",
    detail: "Best for ongoing seasons. Single or double round-robin with standings.",
  },
  {
    id: "swiss",
    title: "Swiss",
    summary: "Fixed rounds, paired by record",
    detail:
      "Each round matches players with the same or similar score (e.g. 2–1 vs 2–1). Common for locals and day events.",
  },
  {
    id: "bracket",
    title: "Bracket",
    summary: "Single elimination",
    detail: "Knockout tree from a fixed bracket size through to a final.",
  },
  {
    id: "hybrid_swiss_cut",
    title: "Swiss → top cut",
    summary: "Swiss day 1, then elimination bracket",
    detail:
      "Official Yu-Gi-Oh! structure: Swiss rounds build standings, then top 8 (or 16/32) enter single-elimination brackets.",
  },
];

export const TIMEZONE_OPTIONS = [
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "UTC",
];
