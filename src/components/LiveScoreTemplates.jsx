import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, ChevronDown, ChevronUp, Gauge } from "lucide-react";

export default function LiveScoreTemplates({ templates, onChange }) {
  const [open, setOpen] = useState(false);
  const [newGame, setNewGame] = useState("");
  const [newScore, setNewScore] = useState("");
  const [newAllowNeg, setNewAllowNeg] = useState(false);

  const addGame = () => {
    const name = newGame.trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (templates[key]) return;
    const start = newScore === "" ? 0 : Number(newScore) || 0;
    onChange({ ...templates, [key]: { label: name, startingScore: start, allowNegative: newAllowNeg } });
    setNewGame("");
    setNewScore("");
    setNewAllowNeg(false);
  };

  const removeGame = (key) => {
    const next = { ...templates };
    delete next[key];
    onChange(next);
  };

  const updateScore = (key, val) => {
    if (val !== "" && val !== "-" && !/^-?\d*$/.test(val)) return;
    onChange({ ...templates, [key]: { ...templates[key], startingScore: val === "" ? 0 : Number(val) || 0 } });
  };

  const toggleNegative = (key) => {
    onChange({ ...templates, [key]: { ...templates[key], allowNegative: !templates[key].allowNegative } });
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Gauge className="w-4 h-4 text-muted-foreground" />
          Manage Starting Scores
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 space-y-3">
          {Object.entries(templates).map(([key, entry]) => (
            <div key={key} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border flex-wrap">
              <span className="text-sm font-medium text-foreground flex-1 truncate min-w-0">{entry.label}</span>
              <span className="text-xs text-muted-foreground">Start:</span>
              <Input
                className="h-7 w-16 text-center text-sm bg-card flex-shrink-0"
                value={String(entry.startingScore ?? 0)}
                onChange={(e) => updateScore(key, e.target.value)}
                inputMode="numeric"
              />
              <button
                type="button"
                onClick={() => toggleNegative(key)}
                title="Allow negative scores"
                className={`h-7 px-2 rounded-md text-xs font-semibold border transition-colors flex-shrink-0 ${
                  entry.allowNegative
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                ±
              </button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0" onClick={() => removeGame(key)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}

          {Object.keys(templates).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-1">No templates yet. Add a game below.</p>
          )}

          <div className="flex gap-2 pt-1 flex-wrap">
            <Input
              placeholder="Game name"
              value={newGame}
              onChange={(e) => setNewGame(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGame())}
              className="flex-1 h-9 text-sm bg-card min-w-0"
            />
            <Input
              placeholder="Start"
              value={newScore}
              onChange={(e) => setNewScore(e.target.value)}
              className="w-16 h-9 text-center text-sm bg-card flex-shrink-0"
              inputMode="numeric"
            />
            <button
              type="button"
              onClick={() => setNewAllowNeg((v) => !v)}
              title="Allow negative scores"
              className={`h-9 px-3 rounded-md text-sm font-semibold border transition-colors flex-shrink-0 ${
                newAllowNeg
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              ±
            </button>
            <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 flex-shrink-0" onClick={addGame}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}