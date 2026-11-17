import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, ChevronDown, ChevronUp, Tag, Lock } from "lucide-react";

const BUILT_IN = {
  root: {
    label: "Root",
    builtin: true,
    options: [
      "Marquise de Cat", "Eyrie Dynasties", "Woodland Alliance", "Vagabond",
      "Riverfolk Company", "Lizard Cult", "Underground Duchy", "Corvid Conspiracy",
      "Lord of the Hundreds", "Keepers in Iron", "Lilypad Diaspora", "Twilight Council",
      "Knaves of the Deepwood",
    ],
  },
  clocktower: {
    label: "Blood on the Clocktower",
    builtin: true,
    options: ["Good", "Evil"],
  },
};

export default function CustomFactionManager({ customFactions, onChange }) {
  const [open, setOpen] = useState(false);
  const [newGame, setNewGame] = useState("");
  const [newOption, setNewOption] = useState({});

  // Merged view: built-ins first, then custom
  const allEntries = [
    ...Object.entries(BUILT_IN),
    ...Object.entries(customFactions),
  ];

  const addGame = () => {
    const name = newGame.trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (BUILT_IN[key] || customFactions[key]) return;
    const next = { ...customFactions, [key]: { label: name, options: [] } };
    onChange(next);
    setNewGame("");
  };

  const removeGame = (key) => {
    const next = { ...customFactions };
    delete next[key];
    onChange(next);
  };

  const addOption = (key, isBuiltin) => {
    const val = newOption[key]?.trim();
    if (!val) return;
    if (isBuiltin) {
      // Store override in customFactions merging with builtin
      const base = customFactions[key] ?? { label: BUILT_IN[key].label, options: [...BUILT_IN[key].options] };
      if (base.options.includes(val)) return;
      onChange({ ...customFactions, [key]: { ...base, options: [...base.options, val] } });
    } else {
      const entry = customFactions[key];
      if (entry.options.includes(val)) return;
      onChange({ ...customFactions, [key]: { ...entry, options: [...entry.options, val] } });
    }
    setNewOption({ ...newOption, [key]: "" });
  };

  const removeOption = (key, opt, isBuiltin) => {
    if (isBuiltin) {
      const base = customFactions[key] ?? { label: BUILT_IN[key].label, options: [...BUILT_IN[key].options] };
      onChange({ ...customFactions, [key]: { ...base, options: base.options.filter((o) => o !== opt) } });
    } else {
      const entry = customFactions[key];
      onChange({ ...customFactions, [key]: { ...entry, options: entry.options.filter((o) => o !== opt) } });
    }
  };

  const getOptions = (key, isBuiltin) => {
    if (isBuiltin) {
      // If there's a custom override, use that; otherwise use builtin defaults
      return customFactions[key]?.options ?? BUILT_IN[key].options;
    }
    return customFactions[key]?.options ?? [];
  };

  const getLabel = (key, isBuiltin) => {
    if (isBuiltin) return customFactions[key]?.label ?? BUILT_IN[key].label;
    return customFactions[key]?.label ?? key;
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Tag className="w-4 h-4 text-muted-foreground" />
          Manage "Played As" Lists
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 space-y-4">

          {allEntries.map(([key, rawEntry]) => {
            const isBuiltin = !!BUILT_IN[key];
            const options = getOptions(key, isBuiltin);
            const label = getLabel(key, isBuiltin);
            return (
              <div key={key} className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isBuiltin && <Lock className="w-3 h-3 text-muted-foreground" />}
                    <span className="text-sm font-semibold text-foreground">{label}</span>
                  </div>
                  {!isBuiltin && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeGame(key)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {options.map((opt) => (
                    <span key={opt} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-xs text-primary font-medium">
                      {opt}
                      <button type="button" onClick={() => removeOption(key, opt, isBuiltin)} className="hover:text-destructive ml-0.5">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add option…"
                    value={newOption[key] ?? ""}
                    onChange={(e) => setNewOption({ ...newOption, [key]: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption(key, isBuiltin))}
                    className="flex-1 h-8 text-sm bg-card"
                  />
                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => addOption(key, isBuiltin)}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Add new game */}
          <div className="flex gap-2 pt-1">
            <Input
              placeholder="New game (e.g. Scythe)"
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