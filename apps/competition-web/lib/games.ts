/**
 * The game an event is played in. Chosen in the wizard and then fixed; the
 * official logos are kept with the site (public/games), not linked to Konami.
 */

export type EventGame = "master_duel" | "advanced" | "genesys";

export type GameInfo = {
  id: EventGame;
  label: string;
  /** What the event page's list tab is called. */
  listTab: string;
  logo: string;
  summary: string;
};

export const GAMES: GameInfo[] = [
  {
    id: "master_duel",
    label: "Master Duel",
    listTab: "Ban List",
    logo: "/games/master-duel.png",
    summary: "Played online in Yu-Gi-Oh! Master Duel.",
  },
  {
    id: "advanced",
    label: "Advanced",
    listTab: "Ban List",
    logo: "/games/advanced.png",
    summary: "The TCG with the Advanced Forbidden & Limited list.",
  },
  {
    id: "genesys",
    label: "Genesys",
    listTab: "Genesys Points List",
    logo: "/games/genesys.png",
    summary: "The TCG with Genesys points instead of a ban list.",
  },
];

export function gameInfo(game: string | null | undefined): GameInfo | null {
  return GAMES.find((g) => g.id === game) ?? null;
}

/** A Master Duel ID (9 digits) as the game shows it: 123-456-789. */
export function formatMasterDuelId(id: string | null | undefined): string {
  if (!id) return "";
  return /^\d{9}$/.test(id) ? id.replace(/^(\d{3})(\d{3})(\d{3})$/, "$1-$2-$3") : id;
}

/** "123-456-789", "123 456 789" or 9 digits; empty is fine (none). */
export function isMasterDuelIdInput(value: string): boolean {
  const digits = value.replace(/[\s-]/g, "");
  return digits === "" || /^\d{9}$/.test(digits);
}
