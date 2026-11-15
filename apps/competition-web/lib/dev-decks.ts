/** Dev deck revision IDs — must match @enigmic/competition-mocks mock-deck-{participantId} pattern. */
export function devDeckRevisionId(participantId: string): string {
  return `mock-deck-${participantId}`;
}
