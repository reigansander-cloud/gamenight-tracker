import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Gamepad2, Trophy, Hash, Target } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ShrinkText from "@/components/ShrinkText";

function dedupeFactionsPerGame(games) {
  // For faction stats: count each faction only once per game session (not per player)
  const map = {};
  games.forEach((game) => {
    const key = game.game_name?.trim().toLowerCase();
    if (!key) return;
    if (!map[key]) map[key] = { name: game.game_name.trim(), timesPlayed: 0, scores: [], players: {}, factions: {}, lastPlayed: null, instances: [] };
    map[key].timesPlayed++;
    const d = game.date_played;
    if (d && (!map[key].lastPlayed || d > map[key].lastPlayed)) map[key].lastPlayed = d;

    game.players?.forEach((p) => {
      const pKey = p.name?.trim().toLowerCase();
      if (!pKey) return;
      if (!map[key].players[pKey]) map[key].players[pKey] = { name: p.name.trim(), wins: 0, plays: 0, scores: [] };
      map[key].players[pKey].plays++;
      if (p.is_winner) map[key].players[pKey].wins++;
      if (p.score != null) { map[key].players[pKey].scores.push(p.score); map[key].scores.push(p.score); }
    });

    const seenFactions = new Set();
    game.players?.forEach((p) => {
      const fKey = p.faction?.trim().toLowerCase();
      if (!fKey || seenFactions.has(fKey)) return;
      seenFactions.add(fKey);
      if (!map[key].factions[fKey]) map[key].factions[fKey] = { name: p.faction.trim(), wins: 0, plays: 0, scores: [] };
      map[key].factions[fKey].plays++;
      if (p.is_winner) map[key].factions[fKey].wins++;
      if (p.score != null) map[key].factions[fKey].scores.push(p.score);
    });

    map[key].instances.push({
      date: game.date_played,
      players: (game.players || []).map((p) => ({ name: p.name?.trim() || "", score: p.score, faction: p.faction?.trim() || undefined, is_winner: !!p.is_winner })),
    });
  });
  return map;
}

function GameCard({ game, gameData }) {
  const maxPlays = Math.max(...gameData.map((g) => g.timesPlayed));
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
        <button
          type="button"
          className="w-full flex items-center justify-between px-5 py-4 text-left"
          onClick={() => setPopupOpen(true)}
        >
          <div className="min-w-0 flex-1 pr-3">
            <ShrinkText as="h3" basePx={16} minPx={10} className="font-display font-semibold text-foreground" title={game.name}>{game.name}</ShrinkText>
            <div className="flex items-center gap-4 mt-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{game.timesPlayed} plays</span>
              {game.avgScore !== null && <span className="flex items-center gap-1"><Target className="w-3 h-3" />Avg {game.avgScore}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${Math.min(100, (game.timesPlayed / maxPlays) * 100)}%` }}
              />
            </div>
          </div>
        </button>
      </div>

      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-base">{game.name}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="games">
            <TabsList className="w-full">
              <TabsTrigger value="games" className="flex-1">Games</TabsTrigger>
              <TabsTrigger value="leaderboard" className="flex-1">Leaderboard</TabsTrigger>
            </TabsList>

            <TabsContent value="games">
              <div className="space-y-2">
                {game.instances.length === 0 && <p className="text-sm text-muted-foreground">No games logged.</p>}
                {game.instances.map((inst, i) => (
                  <div key={i} className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground mb-2">{inst.date || "Unknown date"}</p>
                    <div className="space-y-1">
                      {inst.players.map((pl, j) => (
                        <div key={j} className={`flex items-center justify-between text-sm px-2 py-1 rounded ${pl.is_winner ? "bg-green-500/10 text-foreground font-medium" : "text-foreground"}`}>
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="flex flex-col min-w-0">
                              <span className="truncate">{pl.name}</span>
                              {pl.faction && <span className="text-[10px] text-muted-foreground truncate">as {pl.faction}</span>}
                            </span>
                            {pl.is_winner && <Trophy className="w-3 h-3 text-accent shrink-0" />}
                          </span>
                          <span className="text-muted-foreground text-xs shrink-0 ml-2">{pl.score != null ? pl.score : "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="leaderboard">
              <div className="space-y-4">
                {game.leaderboard.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Leaderboard</h4>
                    <div className="space-y-1.5">
                      {game.leaderboard.map((player, i) => (
                        <div key={player.name} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-display font-bold text-muted-foreground w-5">#{i + 1}</span>
                            <span className="text-sm font-medium text-foreground">{player.name}</span>
                            {i === 0 && <Trophy className="w-3.5 h-3.5 text-accent" />}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{player.wins}W / {player.plays - player.wins}L</span>
                            <span className="font-semibold text-foreground">{player.winRate}%</span>
                            {player.avgScore !== null && <span>avg {player.avgScore}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {game.factionboard.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">By Faction / Role</h4>
                    <div className="space-y-1.5">
                      {game.factionboard.map((f, i) => (
                        <div key={f.name} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-primary/5 border border-primary/10">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-display font-bold text-muted-foreground w-5">#{i + 1}</span>
                            <span className="text-sm font-medium text-foreground">{f.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{f.wins}W / {f.plays - f.wins}L</span>
                            <span className="font-semibold text-foreground">{f.winRate}%</span>
                            {f.avgScore !== null && <span>avg {f.avgScore}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function GameStats() {
  const { data: games = [], isLoading } = useQuery({
    queryKey: ["gamelogs"],
    queryFn: () => base44.entities.GameLog.list("-created_date", 500),
  });

  const gameData = useMemo(() => {
    const map = dedupeFactionsPerGame(games);
    return Object.values(map).map((g) => ({
      ...g,
      avgScore: g.scores.length > 0 ? Math.round((g.scores.reduce((a, b) => a + b, 0) / g.scores.length) * 10) / 10 : null,
      instances: [...g.instances].sort((a, b) => new Date(b.date) - new Date(a.date)),
      factionboard: Object.values(g.factions).map((f) => ({
        ...f,
        winRate: f.plays > 0 ? Math.round((f.wins / f.plays) * 100) : 0,
        avgScore: f.scores.length > 0 ? Math.round((f.scores.reduce((a, b) => a + b, 0) / f.scores.length) * 10) / 10 : null,
      })).sort((a, b) => b.winRate - a.winRate),
      leaderboard: Object.values(g.players).map((p) => ({
        ...p,
        winRate: p.plays > 0 ? Math.round((p.wins / p.plays) * 100) : 0,
        avgScore: p.scores.length > 0 ? Math.round((p.scores.reduce((a, b) => a + b, 0) / p.scores.length) * 10) / 10 : null,
      })).sort((a, b) => b.winRate - a.winRate),
    })).sort((a, b) => b.timesPlayed - a.timesPlayed);
  }, [games]);

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
        <h1 className="font-display font-bold text-2xl text-foreground">Game Stats</h1>
        <p className="text-muted-foreground text-sm mt-1">Which games hit the table the most?</p>
      </div>

      {gameData.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Gamepad2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-display font-semibold text-foreground">No games tracked yet</p>
          <p className="text-sm text-muted-foreground mt-1">Start logging to see your favorites</p>
        </div>
      ) : (
        <div className="space-y-2">
          {gameData.map((game) => <GameCard key={game.name} game={game} gameData={gameData} />)}
        </div>
      )}
    </div>
  );
}