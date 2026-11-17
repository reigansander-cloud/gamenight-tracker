import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Play, Send, Trophy } from "lucide-react";
import LiveScoreDialog from "@/components/LiveScoreDialog";

// Phase 1: pick player count
function PlayerCountPicker({ playerCount, setPlayerCount, onStart, onClose }) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xs w-full">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Quick Live Score</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-2">
          <p className="text-sm text-muted-foreground">How many players?</p>
          <div className="flex items-center gap-6">
            <button
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
              onClick={() => setPlayerCount((n) => Math.max(2, n - 1))}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-display font-bold text-5xl tabular-nums w-12 text-center">{playerCount}</span>
            <button
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
              onClick={() => setPlayerCount((n) => Math.min(8, n + 1))}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <Button className="w-full gap-2" onClick={onStart}>
            <Play className="w-4 h-4" /> Start
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Phase 3: enter names + game name after scoring
function LogGamePrompt({ results, isMtg, onConfirm, onCancel }) {
  const [gameName, setGameName] = useState(isMtg ? "Magic" : "");
  const [names, setNames] = useState(results.map(() => ""));

  const allNamesFilled = names.every((n) => n.trim());

  const handleSubmit = () => {
    if (!gameName.trim() || !allNamesFilled) return;
    const filled = results.map((r, i) => ({ ...r, name: names[i].trim() }));
    onConfirm({ gameName: gameName.trim(), players: filled });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm w-full">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Log This Game</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Game Name</label>
            <Input
              placeholder="e.g. Catan, Monopoly…"
              value={gameName}
              onChange={(e) => !isMtg && setGameName(e.target.value)}
              readOnly={isMtg}
              autoFocus={!isMtg}
              className={isMtg ? "bg-muted text-muted-foreground cursor-default" : ""}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Player Names</label>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  {r.is_winner
                    ? <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />
                    : r.score != null
                      ? <span className={`text-xs w-4 text-right shrink-0 ${r.score < 0 ? "text-red-500" : "text-muted-foreground"}`}>{r.score}</span>
                      : <span className="w-4 shrink-0" />
                  }
                  <Input
                    placeholder={`Player ${i + 1}`}
                    value={names[i]}
                    onChange={(e) => {
                      const next = [...names];
                      next[i] = e.target.value;
                      setNames(next);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
            <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={!gameName.trim() || !allNamesFilled}>
              <Send className="w-4 h-4" /> Log Game
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function QuickLiveScore({ open, onClose, onLogGame }) {
  const [phase, setPhase] = useState("pick"); // "pick" | "live" | "log"
  const [playerCount, setPlayerCount] = useState(2);
  const [results, setResults] = useState(null);
  const [isMtg, setIsMtg] = useState(false);

  // Reset to pick phase whenever the dialog opens fresh
  useEffect(() => {
    if (open) {
      setPhase("pick");
      setResults(null);
      setIsMtg(false);
    }
  }, [open]);

  const players = Array.from({ length: playerCount }, (_, i) => ({ name: `Player ${i + 1}` }));

  const reset = () => { setPhase("pick"); setResults(null); setIsMtg(false); };

  const handleLiveClose = () => { reset(); onClose(); };
  const handleLogCancel = () => { reset(); onClose(); };

  const handleLogConfirm = ({ gameName, players: filledPlayers }) => {
    onLogGame?.({ gameName, players: filledPlayers });
    reset();
    onClose();
  };

  // Phase: pick
  if (!open && phase !== "log") return null;

  if (phase === "pick" && open) {
    return (
      <PlayerCountPicker
        playerCount={playerCount}
        setPlayerCount={setPlayerCount}
        onStart={() => setPhase("live")}
        onClose={onClose}
      />
    );
  }

  if (phase === "live") {
    return (
      <LiveScoreDialog
        open={true}
        onClose={handleLiveClose}
        players={players}
        gameName=""
        customStartingPoints={{}}
        onFinish={(res, finishIsMtg) => {
          setResults(res);
          setIsMtg(!!finishIsMtg);
          setPhase("log");
        }}
        quickMode={true}
      />
    );
  }

  if (phase === "log" && results) {
    return (
      <LogGamePrompt
        results={results}
        isMtg={isMtg}
        onConfirm={handleLogConfirm}
        onCancel={handleLogCancel}
      />
    );
  }

  return null;
}