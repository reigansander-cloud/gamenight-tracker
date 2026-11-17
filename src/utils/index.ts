export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

// Format a performance offset (relative to 0): +N for positive, -N for negative, 0 as "0".
export function formatPerformance(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value > 0) return `+${value}`;
  return `${value}`;
}

// Returns a player's z-score for a single game: (score - mean) / stdev across
// all players who recorded a score. Scale-invariant (5/10/15 == 50/100/150).
// Returns null when the player has no score, fewer than 2 scored players, or
// every score is identical (stdev 0) — those games can't be evaluated.
export function gameZScore(playerScore: number | null | undefined, allScores: number[]): number | null {
  const s = Number(playerScore);
  if (playerScore == null || isNaN(s)) return null;
  const valid = allScores.map(Number).filter((n) => !isNaN(n));
  if (valid.length < 2) return null;
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  const variance = valid.reduce((sum, v) => sum + (v - avg) ** 2, 0) / valid.length;
  const stdev = Math.sqrt(variance);
  if (stdev === 0) return null;
  return (s - avg) / stdev;
}