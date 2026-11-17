import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Trophy, TrendingUp, Activity, Flame } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import PlayerCardEditor from "@/components/PlayerCardEditor";
import PlayerDetailDialog from "@/components/PlayerDetailDialog";
import GuestDetailDialog from "@/components/GuestDetailDialog";
import { recentCutoff, isGuestByRecentCount } from "@/lib/guestStatus";
import { formatPerformance, gameZScore } from "@/utils";

export default function PlayerStats() {
  const queryClient = useQueryClient();
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);

  const { data: games = [], isLoading } = useQuery({
    queryKey: ["gamelogs"],
    queryFn: () => base44.entities.GameLog.list("-created_date", 500),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["playerprofiles"],
    queryFn: () => base44.entities.PlayerProfile.list(),
  });

  const updateAvatar = useMutation({
    mutationFn: async ({ playerName, avatar }) => {
      const existing = profiles.find((p) => p.player_name?.toLowerCase() === playerName.toLowerCase());
      if (existing) return base44.entities.PlayerProfile.update(existing.id, { avatar });
      return base44.entities.PlayerProfile.create({ player_name: playerName, avatar });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playerprofiles"] }),
  });

  const updateColor = useMutation({
    mutationFn: async ({ playerName, color }) => {
      const existing = profiles.find((p) => p.player_name?.toLowerCase() === playerName.toLowerCase());
      if (existing) return base44.entities.PlayerProfile.update(existing.id, { color: color || undefined });
      return base44.entities.PlayerProfile.create({ player_name: playerName, color: color || undefined });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playerprofiles"] }),
  });

  const getAvatar = (name) =>
    profiles.find((p) => p.player_name?.toLowerCase() === name.toLowerCase())?.avatar;

  const getColor = (name) =>
    profiles.find((p) => p.player_name?.toLowerCase() === name.toLowerCase())?.color;

  const updateBg = useMutation({
    mutationFn: async ({ playerName, bg }) => {
      const existing = profiles.find((p) => p.player_name?.toLowerCase() === playerName.toLowerCase());
      if (existing) return base44.entities.PlayerProfile.update(existing.id, { live_score_bg: bg || undefined });
      return base44.entities.PlayerProfile.create({ player_name: playerName, live_score_bg: bg || undefined });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playerprofiles"] }),
  });

  const getBg = (name) =>
    profiles.find((p) => p.player_name?.toLowerCase() === name.toLowerCase())?.live_score_bg;

  const { regularPlayers, guestSummary } = useMemo(() => {
    const cutoff = recentCutoff();

    const map = {};
    const recentGameCount = {}; // games in last month per player
    // Sort games oldest-first to compute win streaks chronologically
    const sorted = [...games].sort((a, b) => new Date(a.date_played) - new Date(b.date_played));
    sorted.forEach((game) => {
      const isRecent = new Date(game.date_played) >= cutoff;
      const validScores = (game.players || []).filter((pl) => pl.score != null && !isNaN(Number(pl.score))).map((pl) => Number(pl.score));
      game.players?.forEach((p) => {
        const key = p.name?.trim().toLowerCase();
        if (!key) return;
        if (!map[key]) map[key] = { name: p.name.trim(), wins: 0, losses: 0, games: 0, streak: 0, maxStreak: 0, perfSum: 0, perfGames: 0 };
        map[key].games++;
        if (isRecent) recentGameCount[key] = (recentGameCount[key] || 0) + 1;
        const z = gameZScore(p.score, validScores);
        if (z !== null) {
          map[key].perfSum += z;
          map[key].perfGames++;
        }
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

    const all = Object.values(map).map((p) => ({
      ...p,
      winRate: p.games > 0 ? Math.round((p.wins / p.games) * 100) : 0,
      recentGames: recentGameCount[p.name.trim().toLowerCase()] || 0,
      performance: p.perfGames > 0 ? Math.round((p.perfSum / p.perfGames) * 100) : null,
    }));

    const regular = all.filter((p) => !isGuestByRecentCount(p.recentGames)).sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);
    const guests = all.filter((p) => isGuestByRecentCount(p.recentGames));

    let guestSummary = null;
    if (guests.length > 0) {
      const totalGames = guests.reduce((s, p) => s + p.games, 0);
      const totalWins = guests.reduce((s, p) => s + p.wins, 0);
      const totalLosses = guests.reduce((s, p) => s + p.losses, 0);
      const totalPerfSum = guests.reduce((s, p) => s + p.perfSum, 0);
      const totalPerfGames = guests.reduce((s, p) => s + p.perfGames, 0);
      guestSummary = {
        name: "Guests",
        displayGames: `${guests.length} players · ${totalGames} games`,
        games: totalGames,
        wins: totalWins,
        losses: totalLosses,
        maxStreak: Math.max(...guests.map((p) => p.maxStreak)),
        winRate: totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0,
        performance: totalPerfGames > 0 ? Math.round((totalPerfSum / totalPerfGames) * 100) : null,
        isGuest: true,
      };
    }

    return { regularPlayers: regular, guestSummary };
  }, [games]);

  const playerData = guestSummary ? [...regularPlayers, guestSummary] : regularPlayers;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground">Player Stats</h1>
        <p className="text-muted-foreground text-sm mt-1">Who reigns supreme at game night?</p>
      </div>

      {playerData.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-display font-semibold text-foreground">No players yet</p>
          <p className="text-sm text-muted-foreground mt-1">Log a game to see stats here</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {playerData.map((player, i) => (
            <div key={player.name} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => player.isGuest ? setGuestDialogOpen(true) : setSelectedPlayer(player)}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {!player.isGuest ? (
                    <PlayerCardEditor
                      current={getAvatar(player.name)}
                      color={getColor(player.name)}
                      bg={getBg(player.name)}
                      onAvatarChange={(emoji) => updateAvatar.mutate({ playerName: player.name, avatar: emoji })}
                      onColorChange={(color) => updateColor.mutate({ playerName: player.name, color })}
                      onBgChange={(bg) => updateBg.mutate({ playerName: player.name, bg })}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl">👥</div>
                  )}
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{player.name}</h3>
                    <p className="text-xs text-muted-foreground">{player.isGuest ? player.displayGames : `${player.games} games played`}</p>
                  </div>
                </div>
                {i === 0 && playerData.length > 1 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/20 text-xs font-medium text-accent">
                    <Trophy className="w-3 h-3 text-accent" /> Top Player
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Wins", value: player.wins },
                          { name: "Losses", value: player.losses },
                        ]}
                        cx="50%" cy="50%" innerRadius={22} outerRadius={34}
                        dataKey="value" strokeWidth={0}
                      >
                        <Cell fill="hsl(160, 60%, 40%)" />
                        <Cell fill="hsl(225, 15%, 88%)" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <StatItem icon={Trophy} label="Win Rate" value={`${player.winRate}%`} />
                  <StatItem icon={TrendingUp} label="Win Loss" value={`${player.wins} - ${player.losses}`} />
                  <StatItem icon={Activity} label="Performance" value={formatPerformance(player.performance)} />
                  <StatItem icon={Flame} label="Best Streak" value={player.maxStreak} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PlayerDetailDialog
        player={selectedPlayer}
        games={games}
        regularPlayers={regularPlayers}
        open={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
      <GuestDetailDialog
        games={games}
        open={guestDialogOpen}
        onClose={() => setGuestDialogOpen(false)}
      />
    </div>
  );
}

function StatItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}