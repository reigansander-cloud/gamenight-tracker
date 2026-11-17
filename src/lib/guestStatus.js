// Shared definition of a "guest": someone who has logged GUEST_MAX_RECENT_GAMES
// or fewer games within the last RECENT_WINDOW_DAYS days.
export const GUEST_MAX_RECENT_GAMES = 7;
export const RECENT_WINDOW_DAYS = 90;

export function recentCutoff() {
  const d = new Date();
  d.setDate(d.getDate() - RECENT_WINDOW_DAYS);
  return d;
}

export function isGuestByRecentCount(count) {
  return (count || 0) <= GUEST_MAX_RECENT_GAMES;
}