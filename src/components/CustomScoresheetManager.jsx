import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, ChevronDown, ChevronUp, LayoutList } from "lucide-react";

export default function CustomScoresheetManager({ customScoresheets, onChange }) {
  const [open, setOpen] = useState(false);
  const [newGame, setNewGame] = useState("");
  const [newCat, setNewCat] = useState({});

  const addGame = () => {
    const name = newGame.trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (customScoresheets[key]) return;
    onChange({ ...customScoresheets, [key]: { label: name, categories: ["1", "2"] } });
    setNewGame("");
  };

  const removeGame = (key) => {
    const next = { ...customScoresheets };
    delete next[key];
    onChange(next);
  };

  const addCategory = (key) => {
    const val = newCat[key]?.trim();
    if (!val) return;
    const entry = customScoresheets[key];
    if (entry.categories.includes(val)) return;
    onChange({ ...customScoresheets, [key]: { ...entry, categories: [...entry.categories, val] } });
    setNewCat({ ...newCat, [key]: "" });
  };

  const removeCategory = (key, cat) => {
    const entry = customScoresheets[key];
    onChange({ ...customScoresheets, [key]: { ...entry, categories: entry.categories.filter((c) => c !== cat) } });
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <LayoutList className="w-4 h-4 text-muted-foreground" />
          Manage Scoresheet Templates
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 space-y-4">

          {Object.entries(customScoresheets).map(([key, entry]) => (
            <div key={key} className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{entry.label}</span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeGame(key)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entry.categories.map((cat) => (
                  <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-xs text-primary font-medium">
                    {cat}
                    <button type="button" onClick={() => removeCategory(key, cat)} className="hover:text-destructive ml-0.5">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add category…"
                  value={newCat[key] ?? ""}
                  onChange={(e) => setNewCat({ ...newCat, [key]: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory(key))}
                  className="flex-1 h-8 text-sm bg-card"
                />
                <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => addCategory(key)}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}

          {Object.keys(customScoresheets).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No templates yet. Add a game below.</p>
          )}

          <div className="flex gap-2 pt-1">
            <Input
              placeholder="Game name (e.g. Wingspan)"
              value={newGame}
              onChange={(e) => setNewGame(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGame())}
              className="flex-1 h-9 text-sm bg-card"
            />
            <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={addGame}>
              <Plus className="w-3.5 h-3.5" /> Add Game
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}