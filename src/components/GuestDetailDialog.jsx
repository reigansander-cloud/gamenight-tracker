import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, TrendingUp, TrendingDown, Flame, Users } from "lucide-react";
import { recentCutoff, isGuestByRecentCount, GUEST_MAX_RECENT_GAMES, RECENT_WINDOW_DAYS } from "@/lib/guestStatus";

export default function GuestDetailDialog({ games, open, onClose }) {
  const guests = useMemo(() => {
    if (!games) return [];
    const cutoff = recentCutoff();
    const map = {};
    const recentGameCount = {};
    const sorted = [...games].sort((a, b) => new Date(a.date_played) - new Date(b.date_played));
    sorted.forEach((game) => {
      const isRecent = new Date(game.date_played) >= cutoff;
      game.players?.forEach((p) => {
        const key = p.name?.trim().toLowerCase();
        if (!key) return;
        if (!map[key]) map[key] = { name: p.name.trim(), wins: 0, losses: 0, games: 0, streak: 0, maxStreak: 0 };
        map[key].games++;
        if (isRecent) recentGameCount[key] = (recentGameCount[key] || 0) + 1;
        if (p.is_winner) {
          map[key].wins++;
          map[key].streak++;
          if (map[key].streak > map[key].maxStreak) map[key].maxStreak = map[key].streak;
        } else {
          map[key].losses++;
          map[key].streak = 0;
        }
      });
    });

    return Object.values(map)
      .filter((p) => isGuestByRecentCount(recentGameCount[p.name.trim().toLowerCase()]))
      .map((p) => ({ ...p, winRate: p.games > 0 ? Math.round((p.wins / p.games) * 100) : 0 }))
      .sort((a, b) => b.winRate - a.winRate || b.games - a.games);
  }, [games]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <Users className="w-5 h-5" /> Guests
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-1 mb-1">
          Guests are players with {GUEST_MAX_RECENT_GAMES} or fewer games logged in the last {Math.round(RECENT_WINDOW_DAYS / 30)} months.
        </p>

        {guests.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No guest players yet.</p>
        ) : (
          <div className="space-y-2">
            {guests.map((p) => (
              <div key={p.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.games} game{p.games !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{p.wins}W</span>
                  <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3" />{p.losses}L</span>
                  <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{p.maxStreak}</span>
                  <span className="flex items-center gap-1 font-semibold text-foreground"><Trophy className="w-3 h-3 text-accent" />{p.winRate}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}