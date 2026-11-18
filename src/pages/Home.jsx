import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Send, TableProperties, Timer, ChevronDown, Recycle } from "lucide-react";
import PlayerInput from "@/components/PlayerInput";
import ScoresheetDialog from "@/components/ScoresheetDialog";
import LiveScoreDialog from "@/components/LiveScoreDialog";
import QuickLiveScore from "@/components/QuickLiveScore";
import GameNameField from "@/components/GameNameField";
import { recentCutoff, isGuestByRecentCount } from "@/lib/guestStatus";
import ListPickerDialog from "@/components/ListPickerDialog";
import { applyScheme } from "@/lib/theme";

const HERO_IMAGES = [
  "https://lh3.googleusercontent.com/d/12S4MkqiFRVomQ9MoKgHnC8BNTdn31IGO",
  "https://lh3.googleusercontent.com/d/1BirJrqeNMNpsKnXlfmtTvii1TMwNDBgU",
  "https://lh3.googleusercontent.com/d/1FCcl7uXbV1G8HzncEvu5XwDaVsrFM-VQ",
  "https://lh3.googleusercontent.com/d/1RPT6QO9aBF5WC0ezGUpcvtdyBVO9eDX6",
];

const emptyPlayer = () => ({ name: "", score: undefined, is_winner: false });

export default function Home() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [gameName, setGameName] = useState("");
  const [players, setPlayers] = useState([emptyPlayer(), emptyPlayer()]);
  const [quickLiveOpen, setQuickLiveOpen] = useState(false);
  // Apply prefill from Quick Live Score log
  useEffect(() => {
    const prefill = location.state?.prefill;
    if (!prefill) return;
    setGameName(prefill.gameName || "");
    if (prefill.players?.length) {
      setPlayers(prefill.players.map((p) => ({
        name: p.name || "",
        score: p.score,
        is_winner: p.is_winner || false,
        faction: p.faction || "",
      })));
    }
    // clear the state so refreshing doesn't re-apply
    window.history.replaceState({}, "");
  }, [location.state]);

  const [scoresheetOpen, setScoresheetOpen] = useState(false);
  const [liveScoreOpen, setLiveScoreOpen] = useState(false);
  const [gamePickerOpen, setGamePickerOpen] = useState(false);

  const heroImage = useMemo(() => HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)], []);

  const handleAddPlayer = () => addPlayer();

  // Fetch user preferences from database
  const { data: prefsData, isLoading: prefsLoading } = useQuery({
    queryKey: ["userPreferences"],
    queryFn: async () => {
      const result = await base44.entities.UserPreferences.filter({});
      return result?.[0] || null;
    },
  });

  const customFactions = prefsData?.custom_factions || {};
  const customScoresheets = prefsData?.custom_scoresheets || {};
  const liveScoreTemplates = prefsData?.live_score_templates || {};

  const { data: profiles = [] } = useQuery({
    queryKey: ["playerprofiles"],
    queryFn: () => base44.entities.PlayerProfile.list(),
  });

  const playerColors = useMemo(() => {
    const map = {};
    profiles.forEach((p) => {
      if (p.color) map[p.player_name.trim()] = p.color;
    });
    return map;
  }, [profiles]);

  const playerBgs = useMemo(() => {
    const map = {};
    profiles.forEach((p) => {
      if (p.live_score_bg) map[p.player_name.trim()] = p.live_score_bg;
    });
    return map;
  }, [profiles]);

  const { data: gameLogs = [] } = useQuery({
    queryKey: ["gamelogs"],
    queryFn: () => base44.entities.GameLog.list("-created_date", 500),
  });

  // Game names by most recent appearance (gameLogs are sorted -created_date)
  const gameSuggestions = useMemo(() => {
    const seen = new Set();
    const ordered = [];
    gameLogs.forEach((g) => {
      const name = g.game_name?.trim();
      if (!name || seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());
      ordered.push(name);
    });
    return ordered;
  }, [gameLogs]);

  // Non-guest players (3+ games in the last 2 weeks), Reigan pinned to top,
  // the rest by most recent appearance.
  const playerSuggestions = useMemo(() => {
    const cutoff = recentCutoff();
    const recentCount = {};
    const displayName = {};
    const recencyOrder = [];
    gameLogs.forEach((g) => {
      const isRecent = new Date(g.date_played) >= cutoff;
      g.players?.forEach((p) => {
        const name = p.name?.trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (isRecent) recentCount[key] = (recentCount[key] || 0) + 1;
        if (!(key in displayName)) { displayName[key] = name; recencyOrder.push(key); }
      });
    });
    const nonGuest = recencyOrder.filter((k) => !isGuestByRecentCount(recentCount[k]));
    const others = nonGuest.filter((k) => k !== "reigan").map((k) => displayName[k]);
    const reigan = nonGuest.find((k) => k === "reigan");
    return reigan ? [displayName["reigan"], ...others] : others;
  }, [gameLogs]);

  const updatePlayerColor = useMutation({
    mutationFn: async ({ playerName, color }) => {
      const existing = profiles.find((p) => p.player_name?.toLowerCase() === playerName.toLowerCase());
      if (existing) return base44.entities.PlayerProfile.update(existing.id, { color: color || undefined });
      return base44.entities.PlayerProfile.create({ player_name: playerName, color: color || undefined });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playerprofiles"] }),
  });

  const updatePlayerBg = useMutation({
    mutationFn: async ({ playerName, bg }) => {
      const existing = profiles.find((p) => p.player_name?.toLowerCase() === playerName.toLowerCase());
      if (existing) return base44.entities.PlayerProfile.update(existing.id, { live_score_bg: bg || undefined });
      return base44.entities.PlayerProfile.create({ player_name: playerName, live_score_bg: bg || undefined });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playerprofiles"] }),
  });

  // Apply theme when DB preference loads (lib/theme.js already applies localStorage version on boot)
  useEffect(() => {
    if (prefsData?.color_scheme) {
      applyScheme(prefsData.color_scheme);
      localStorage.setItem("colorScheme", prefsData.color_scheme);
    }
  }, [prefsData?.color_scheme]);

  // Mutation to save preferences
  const savePrefsMutation = useMutation({
    mutationFn: async (data) => {
      if (prefsData?.id) {
        return base44.entities.UserPreferences.update(prefsData.id, data);
      } else {
        return base44.entities.UserPreferences.create(data);
      }
    },
    // Show the change straight away, so quick edits (adding several categories in a row)
    // each build on the one before instead of on the last saved copy.
    onMutate: (data) => {
      queryClient.setQueryData(["userPreferences"], (old) => ({ ...(old || {}), ...data }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPreferences"] });
    },
  });

  const saveCustomFactions = (val) => {
    savePrefsMutation.mutate({ custom_factions: val });
  };

  const saveCustomScoresheets = (val) => {
    savePrefsMutation.mutate({ custom_scoresheets: val });
  };

  const saveLiveScoreTemplates = (val) => {
    savePrefsMutation.mutate({ live_score_templates: val });
  };

  const buildGamePayload = () => ({
    game_name: gameName.trim(),
    date_played: new Date().toISOString().split("T")[0],
    players: players.filter((p) => p.name.trim()).map((p) => ({
      name: p.name.trim(),
      faction: p.faction?.trim() || undefined,
      score: p.score,
      is_winner: p.is_winner || false,
    })),
  });

  const createGame = useMutation({
    mutationFn: (data) => base44.entities.GameLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamelogs"] });
      setGameName("");
      setPlayers([emptyPlayer(), emptyPlayer()]);
      toast.success("Game logged! Who's winning the rivalry now? 🎲");
    }
  });

  const createGameAndPlayAgain = useMutation({
    mutationFn: (data) => base44.entities.GameLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamelogs"] });
      // Keep game name and player names, but clear scores and winner
      setPlayers((prev) => prev.map((p) => ({ ...p, score: undefined, is_winner: false })));
      toast.success("Game logged! Ready for another round 🎲");
    }
  });

  const updatePlayer = (index, data) => {
    const next = [...players];
    next[index] = data;

    // Auto-mark winner only when the score field changed (not a winner toggle)
    const scoreChanged = data.score !== players[index].score;
    if (scoreChanged) {
      const named = next.filter((p) => p.name?.trim());
      const allHaveScores = named.length >= 2 && named.every((p) => p.score !== undefined && p.score !== "");
      if (allHaveScores) {
        const maxScore = Math.max(...named.map((p) => Number(p.score)));
        next.forEach((p) => {
          if (p.name?.trim()) p.is_winner = Number(p.score) === maxScore;
        });
      }
    }

    setPlayers(next);
  };

  const removePlayer = (index) => setPlayers(players.filter((_, i) => i !== index));
  const addPlayer = () => setPlayers([...players, emptyPlayer()]);

  // Fill the player rows from the most recently logged game
  const fillFromLastGame = () => {
    const last = gameLogs[0];
    const names = last?.players?.filter((p) => p.name?.trim()) || [];
    if (names.length === 0) {
      toast.error("No previous game to copy players from");
      return;
    }
    if (last.game_name?.trim()) setGameName(last.game_name.trim());
    setPlayers(names.map((p) => ({ name: p.name.trim(), score: undefined, is_winner: false })));
    toast.success("Game and players filled from your last game 🎲");
  };

  const canOpenScoresheet =
  gameName.trim() && players.filter((p) => p.name?.trim()).length >= 2;

  const handleScoresheetFinish = (results) => {
    // results: [{ name, score, is_winner }]
    setPlayers((prev) =>
    prev.map((p) => {
      const match = results.find((r) => r.name === p.name?.trim());
      if (!match) return p;
      return { ...p, score: match.score, is_winner: match.is_winner };
    })
    );
    toast.success("Scores applied!");
  };

  const validateForm = () => {
    const validPlayers = players.filter((p) => p.name.trim());
    if (!gameName.trim() || validPlayers.length < 2) {
      toast.error("Add a game name and at least 2 players");
      return false;
    }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    createGame.mutate(buildGamePayload());
  };

  const handleLogAndPlayAgain = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    createGameAndPlayAgain.mutate(buildGamePayload());
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden h-24 sm:h-28">
        <img src={heroImage} alt="Board game night" className="w-full h-full object-cover scale-125" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-6 left-6">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">Log a Game</h1>
          <p className="text-white/80 text-sm mt-1">Record tonight's victory (or defeat)</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">What did you play?</label>
          <div className="flex gap-2">
            <GameNameField
              value={gameName}
              onChange={setGameName}
              suggestions={gameSuggestions} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 bg-card"
              onClick={() => setGamePickerOpen(true)}>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-foreground">Players &amp; Scores</label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={fillFromLastGame}
                title="Fill the game and players from your last game">
                <Recycle className="w-4 h-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleAddPlayer} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Player
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {players.map((player, i) =>
            <PlayerInput
              key={i}
              player={player}
              index={i}
              onUpdate={(data) => updatePlayer(i, data)}
              onRemove={() => removePlayer(i)}
              canRemove={players.length > 2}
              gameName={gameName}
              customFactions={customFactions}
              playerSuggestions={playerSuggestions}
              playerColors={playerColors} />

            )}
          </div>
        </div>

        {/* Tool buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5 border-dashed text-xs h-9 px-2 bg-transparent"
            disabled={!canOpenScoresheet}
            onClick={() => setScoresheetOpen(true)}>
            <TableProperties className="w-4 h-4" />
            Scoresheet
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5 border-dashed text-xs h-9 px-2 bg-transparent"
            onClick={() => canOpenScoresheet ? setLiveScoreOpen(true) : setQuickLiveOpen(true)}>
            <Timer className="w-4 h-4" />
            Live Score
          </Button>
        </div>
        {!canOpenScoresheet &&
        <p className="text-xs text-muted-foreground text-center -mt-2 hidden">Enter game name &amp; at least 2 players to use these tools</p>
        }

        <Button
          type="submit"
          className="w-full h-12 text-base font-display font-semibold gap-2 py-2"
          disabled={createGame.isPending || createGameAndPlayAgain.isPending}>
          {createGame.isPending
            ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            : <><Send className="w-4 h-4" /> Log This Game</>
          }
        </Button>
        <button
          type="button"
          onClick={handleLogAndPlayAgain}
          disabled={createGame.isPending || createGameAndPlayAgain.isPending}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1 disabled:opacity-50"
        >
          {createGameAndPlayAgain.isPending ? "Logging…" : "Log & Play Again"}
        </button>
      </form>

      <ScoresheetDialog
        open={scoresheetOpen}
        onClose={() => setScoresheetOpen(false)}
        players={players}
        gameName={gameName}
        customScoresheets={customScoresheets}
        playerColors={playerColors}
        onFinish={handleScoresheetFinish} />
      

      <LiveScoreDialog
        open={liveScoreOpen}
        onClose={() => setLiveScoreOpen(false)}
        players={players}
        gameName={gameName}
        customStartingPoints={liveScoreTemplates}
        playerColors={playerColors}
        onColorChange={(name, color) => updatePlayerColor.mutate({ playerName: name, color })}
        playerBgs={playerBgs}
        onBgChange={(name, bg) => updatePlayerBg.mutate({ playerName: name, bg })}
        onFinish={handleScoresheetFinish} />

      <QuickLiveScore
        open={quickLiveOpen}
        onClose={() => setQuickLiveOpen(false)}
        onLogGame={({ gameName: gn, players: ps }) => {
          setGameName(gn);
          setPlayers(ps.map((p) => ({
            name: p.name || "",
            score: p.score,
            is_winner: p.is_winner || false,
            faction: p.faction || "",
          })));
          setQuickLiveOpen(false);
        }}
      />

      <ListPickerDialog
        open={gamePickerOpen}
        onClose={() => setGamePickerOpen(false)}
        title="Pick a game"
        items={gameSuggestions}
        onSelect={(name) => {
          setGameName(name);
          setGamePickerOpen(false);
        }}
      />
    </div>);

}