import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trophy, TrendingUp, Flame, Gamepad2, Activity, Info } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatPerformance, gameZScore } from "@/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PlayerDetailDialog({ player, games, regularPlayers, open, onClose }) {
  const [h2hOpp, setH2hOpp] = useState(null);
  const [gameView, setGameView] = useState(null);

  const detail = useMemo(() => {
    if (!player || !games) return null;

    const gameMap = {};
    const h2h = {};
    const playerGames = [];

    games.forEach((game) => {
      const p = game.players?.find((pl) => pl.name?.trim().toLowerCase() === player.name.toLowerCase());
      if (!p) return;

      playerGames.push({
        date_played: game.date_played,
        created_date: game.created_date,
        is_winner: !!p.is_winner,
      });

      const validScores = (game.players || []).filter((pl) => pl.score != null && !isNaN(Number(pl.score))).map((pl) => Number(pl.score));

      const gKey = game.game_name?.trim().toLowerCase();
      if (gKey) {
        if (!gameMap[gKey]) gameMap[gKey] = { name: game.game_name.trim(), wins: 0, plays: 0, scores: [], factions: {}, perfSum: 0, perfGames: 0, instances: [] };
        gameMap[gKey].plays++;
        if (p.is_winner) gameMap[gKey].wins++;
        if (p.score != null) gameMap[gKey].scores.push(p.score);
        const z = gameZScore(p.score, validScores);
        if (z !== null) {
          gameMap[gKey].perfSum += z;
          gameMap[gKey].perfGames++;
        }
        const fKey = p.faction?.trim().toLowerCase();
        if (fKey) {
          const fm = gameMap[gKey].factions;
          if (!fm[fKey]) fm[fKey] = { name: p.faction.trim(), wins: 0, plays: 0 };
          fm[fKey].plays++;
          if (p.is_winner) fm[fKey].wins++;
        }
        gameMap[gKey].instances.push({
          date: game.date_played,
          players: (game.players || []).map((pl) => ({ name: pl.name?.trim() || "", score: pl.score, faction: pl.faction?.trim() || undefined, is_winner: !!pl.is_winner })),
        });
      }

      // Head-to-head against other regular players in this game
      game.players?.forEach((opp) => {
        const oppKey = opp.name?.trim().toLowerCase();
        if (!oppKey || oppKey === player.name.toLowerCase()) return;
        if (regularPlayers && !regularPlayers.some((rp) => rp.name.toLowerCase() === oppKey)) return;

        const myScore = p.score != null && !isNaN(Number(p.score)) ? Number(p.score) : null;
        const oppScore = opp.score != null && !isNaN(Number(opp.score)) ? Number(opp.score) : null;

        if (!h2h[oppKey]) h2h[oppKey] = { name: opp.name.trim(), wins: 0, losses: 0, ties: 0, games: [] };

        if (p.is_winner && !opp.is_winner) h2h[oppKey].wins++;
        else if (!p.is_winner && opp.is_winner) h2h[oppKey].losses++;
        else {
          // Both won or both lost — decide by score, tie only if equal or no scores
          if (myScore != null && oppScore != null) {
            if (myScore > oppScore) h2h[oppKey].wins++;
            else if (myScore < oppScore) h2h[oppKey].losses++;
            else h2h[oppKey].ties++;
          } else {
            h2h[oppKey].ties++;
          }
        }

        h2h[oppKey].games.push({
          gameName: game.game_name,
          date: game.date_played,
          myName: player.name,
          oppName: opp.name.trim(),
          myScore: p.score,
          oppScore: opp.score,
          myWon: !!p.is_winner,
          oppWon: !!opp.is_winner,
        });
      });
    });

    const gameBreakdown = Object.values(gameMap).map((g) => ({
      ...g,
      winRate: Math.round((g.wins / g.plays) * 100),
      avgScore: g.scores.length > 0 ? Math.round((g.scores.reduce((a, b) => a + b, 0) / g.scores.length) * 10) / 10 : null,
      performance: g.perfGames > 0 ? Math.round((g.perfSum / g.perfGames) * 100) : null,
      instances: [...g.instances].sort((a, b) => new Date(b.date) - new Date(a.date)),
      factionList: Object.values(g.factions).map((f) => ({
        ...f,
        winRate: Math.round((f.wins / f.plays) * 100),
      })).sort((a, b) => b.winRate - a.winRate),
    })).sort((a, b) => b.plays - a.plays);

    const headToHead = Object.values(h2h).map((o) => {
      const decisive = o.wins + o.losses;
      return {
        ...o,
        games: [...o.games].sort((a, b) => new Date(b.date) - new Date(a.date)),
        totalGames: o.wins + o.losses + o.ties,
        winRate: decisive > 0 ? Math.round((o.wins / decisive) * 100) : null,
      };
    }).sort((a, b) => b.totalGames - a.totalGames);

    // Tendencies: win after win / win after loss (chronological)
    const chrono = [...playerGames].sort((a, b) => {
      const da = new Date(a.date_played).getTime() || 0;
      const db = new Date(b.date_played).getTime() || 0;
      if (da !== db) return da - db;
      return (new Date(a.created_date).getTime() || 0) - (new Date(b.created_date).getTime() || 0);
    });
    let pWin = 0, pWinWon = 0, pLoss = 0, pLossLost = 0;
    for (let i = 1; i < chrono.length; i++) {
      const prev = chrono[i - 1].is_winner;
      const cur = chrono[i].is_winner;
      if (prev) { pWin++; if (cur) pWinWon++; } else { pLoss++; if (!cur) pLossLost++; }
    }
    const winAfterWin = pWin > 0 ? Math.round((pWinWon / pWin) * 100) : null;
    const lossAfterLoss = pLoss > 0 ? Math.round((pLossLost / pLoss) * 100) : null;

    // By day of week (averaged per week since first game) + avg games per day since first game
    const weekdayWins = [0, 0, 0, 0, 0, 0, 0];
    const weekdayLosses = [0, 0, 0, 0, 0, 0, 0];
    const validDates = [];
    playerGames.forEach((g) => {
      const d = new Date(g.date_played);
      if (isNaN(d.getTime())) return;
      validDates.push(d.getTime());
      const wd = d.getDay();
      if (g.is_winner) weekdayWins[wd]++; else weekdayLosses[wd]++;
    });
    const firstMs = validDates.length ? Math.min(...validDates) : null;
    const todayMs = new Date();
    todayMs.setHours(0, 0, 0, 0);
    const daysSince = firstMs != null ? Math.max(1, Math.floor((todayMs.getTime() - firstMs) / 86400000) + 1) : 1;
    const weeksSince = Math.max(1, daysSince / 7);
    const weekdayData = WEEKDAYS.map((day, wd) => ({
      day,
      Wins: +(weekdayWins[wd] / weeksSince).toFixed(1),
      Losses: +(weekdayLosses[wd] / weeksSince).toFixed(1),
    }));
    const avgGamesPerDay = +(playerGames.length / daysSince).toFixed(2);

    const mostPlayedGame = gameBreakdown.length > 0 ? { name: gameBreakdown[0].name, plays: gameBreakdown[0].plays } : null;

    return { gameBreakdown, headToHead, winAfterWin, lossAfterLoss, weekdayData, avgGamesPerDay, mostPlayedGame };
  }, [player, games, regularPlayers]);

  const h2hDetail = detail?.headToHead.find((o) => o.name === h2hOpp);
  const gameDetail = detail?.gameBreakdown.find((g) => g.name === gameView);

  if (!player || !detail) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">{player.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Overall stats */}
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[{ name: "Wins", value: player.wins }, { name: "Losses", value: player.losses }]}
                    cx="50%" cy="50%" innerRadius={26} outerRadius={40}
                    dataKey="value" strokeWidth={0}
                  >
                    <Cell fill="hsl(160, 60%, 40%)" />
                    <Cell fill="hsl(225, 15%, 88%)" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 flex-1">
              <Stat label="Win Rate" value={`${player.winRate}%`} icon={Trophy} />
              <Stat label="Win Loss" value={`${player.wins} - ${player.losses}`} icon={TrendingUp} />
              <PerformanceStat value={player.performance} />
              <Stat label="Best Streak" value={player.maxStreak} icon={Flame} />
            </div>
          </div>

          {/* Tendencies & patterns */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Win after Win" value={detail.winAfterWin != null ? `${detail.winAfterWin}%` : "—"} icon={TrendingUp} />
              <Stat label="Loss after Loss" value={detail.lossAfterLoss != null ? `${detail.lossAfterLoss}%` : "—"} icon={TrendingUp} />
              <Stat label="Avg games/day" value={detail.avgGamesPerDay} icon={Activity} />
              <Stat label="Most Played" value={detail.mostPlayedGame ? detail.mostPlayedGame.name : "—"} icon={Gamepad2} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Games by Day of Week <span className="font-normal">(avg per week)</span></p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={detail.weekdayData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="Wins" stackId="a" fill="hsl(160, 60%, 40%)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Losses" stackId="a" fill="hsl(0, 70%, 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Head-to-head */}
          {detail.headToHead.length > 0 && (
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="flex items-center gap-1 mb-2 text-left">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Head-to-Head</h4>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="max-w-xs text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1 text-sm">How ties are counted</p>
                  <p>Wins and losses are decided by the game's result. When both players share the same result (both won or both lost), the higher score counts as a win and the lower score a loss. Ties only count when scores were equal or the game had no scores.</p>
                </PopoverContent>
              </Popover>
              <div className="space-y-1.5">
                {detail.headToHead.map((opp) => (
                  <button
                    key={opp.name}
                    type="button"
                    className="w-full flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                    onClick={() => setH2hOpp(opp.name)}
                  >
                    <span className="text-sm font-medium text-foreground">vs {opp.name}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{opp.wins}W / {opp.losses}L{opp.ties > 0 ? ` / ${opp.ties}T` : ""}</span>
                      <span>{opp.totalGames} games</span>
                      {opp.winRate !== null && (
                        <span className={`font-semibold ${opp.winRate >= 50 ? "text-green-600" : "text-destructive"}`}>{opp.winRate}%</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Per-game breakdown with factions nested inside */}
          {detail.gameBreakdown.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">By Game</h4>
              <div className="space-y-3">
                {detail.gameBreakdown.map((g) => (
                  <div key={g.name} className="rounded-lg bg-muted/50 overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between py-1.5 px-3 hover:bg-muted transition-colors text-left"
                      onClick={() => setGameView(g.name)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Gamepad2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">{g.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">{g.plays} plays</span>
                    </button>
                    <div className="flex items-center justify-between gap-1 px-3 pb-1.5 pt-0.5">
                      <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{g.wins}-{g.plays - g.wins}</span> W-L</span>
                      <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{g.winRate}%</span> WR</span>
                      {g.avgScore !== null && <span className="text-xs text-muted-foreground">avg <span className="font-semibold text-foreground">{g.avgScore}</span></span>}
                      {g.performance !== null && <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{formatPerformance(g.performance)}</span> perf</span>}
                    </div>
                    {g.factionList.length > 0 && (
                      <div className="border-t border-border/50 px-3 pb-2 pt-1.5 space-y-1">
                        {g.factionList.map((f) => (
                          <div key={f.name} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-primary/5 border border-primary/10">
                            <span className="text-foreground font-medium">{f.name}</span>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <span>{f.wins}W / {f.plays - f.wins}L</span>
                              <span className="font-semibold text-foreground">{f.winRate}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Head-to-head matchup popup */}
        <Dialog open={!!h2hOpp} onOpenChange={(v) => !v && setH2hOpp(null)}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-base">{player.name} vs {h2hOpp}</DialogTitle>
            </DialogHeader>
            {h2hDetail && (
              <div className="space-y-2 pt-1">
                {h2hDetail.games.length === 0 && <p className="text-sm text-muted-foreground">No games found.</p>}
                {h2hDetail.games.map((g, i) => (
                  <div key={i} className="rounded-lg bg-muted/50 p-3">
                    <p className="text-sm font-medium text-foreground">{g.gameName || "Game"}</p>
                    <p className="text-xs text-muted-foreground mb-2">{g.date || "Unknown date"}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <PlayerResult name={g.myName} score={g.myScore} won={g.myWon} />
                      <PlayerResult name={g.oppName} score={g.oppScore} won={g.oppWon} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* By-game instances popup */}
        <Dialog open={!!gameView} onOpenChange={(v) => !v && setGameView(null)}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-base">{gameView}</DialogTitle>
            </DialogHeader>
            {gameDetail && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-muted-foreground">{gameDetail.plays} games played</p>
                {gameDetail.instances.map((inst, i) => (
                  <div key={i} className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground mb-2">{inst.date || "Unknown date"}</p>
                    <div className="space-y-1">
                      {inst.players.map((pl, j) => (
                        <div key={j} className={`flex items-center justify-between text-sm px-2 py-1 rounded ${pl.name?.toLowerCase() === player.name.toLowerCase() ? "bg-primary/10 text-foreground font-medium" : "text-foreground"}`}>
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
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function PlayerResult({ name, score, won }) {
  return (
    <div className={`flex items-center justify-between text-sm px-2 py-1 rounded ${won ? "bg-green-500/10 text-foreground" : "text-foreground"}`}>
      <span className="flex items-center gap-1.5 min-w-0">
        <span className="truncate">{name}</span>
        {won && <Trophy className="w-3 h-3 text-accent shrink-0" />}
      </span>
      <span className="text-muted-foreground text-xs shrink-0 ml-2">{score != null ? score : "—"}</span>
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function PerformanceStat({ value }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 text-left">
          <Activity className="w-3.5 h-3.5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">Performance <Info className="w-3 h-3" /></p>
            <p className="text-sm font-semibold text-foreground">{formatPerformance(value)}</p>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1 text-sm">Performance</p>
        <p>For each game you log, we measure how far your score is from the game's average in units of standard deviation (a z-score), so a game with scores 5/10/15 counts the same as 50/100/150. We average those z-scores across your games and show the result as a percentage: 0 means you scored the average, +122 means ~1.2 standard deviations above, negatives mean below. Games where everyone tied or you had no score are skipped.</p>
      </PopoverContent>
    </Popover>
  );
}