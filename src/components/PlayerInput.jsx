import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Trophy } from "lucide-react";
import RepressInput from "@/components/RepressInput";
import ScoreCalculator from "@/components/ScoreCalculator";
import PlayerNameField from "@/components/PlayerNameField";

const BUILTIN_OPTIONS = {
  root: [
    "Marquise de Cat", "Eyrie Dynasties", "Woodland Alliance", "Vagabond",
    "Riverfolk Company", "Lizard Cult", "Underground Duchy", "Corvid Conspiracy",
    "Lord of the Hundreds", "Keepers in Iron", "Lilypad Diaspora", "Twilight Council",
    "Knaves of the Deepwood",
  ],
  clocktower: ["Good", "Evil"],
  "blood on the clocktower": ["Good", "Evil"],
};

function getFactionOptions(gameName, customFactions = {}) {
  const name = gameName?.trim().toLowerCase();
  if (!name) return null;
  // Custom override takes priority, then builtin
  if (customFactions[name]?.options?.length) return customFactions[name].options;
  if (BUILTIN_OPTIONS[name]) return BUILTIN_OPTIONS[name];
  return null;
}

function getFactionMode(gameName, customFactions = {}) {
  return getFactionOptions(gameName, customFactions) ? "dropdown" : "text";
}

export default function PlayerInput({ player, index, onUpdate, onRemove, canRemove, gameName, customFactions = {}, showPlayedAs = false, highlighted = false, playerSuggestions = [], playerColors = {} }) {
  const dropdownOptions = getFactionOptions(gameName, customFactions);
  const showFactionRow = showPlayedAs || !!dropdownOptions;

  const [calcOpen, setCalcOpen] = useState(false);

  const factionInput = () => {
    if (dropdownOptions) {
      return (
        <Select value={player.faction ?? ""} onValueChange={(val) => onUpdate({ ...player, faction: val })}>
          <SelectTrigger className="flex-1 bg-card border-border text-sm h-9">
            <SelectValue placeholder="Select faction…" />
          </SelectTrigger>
          <SelectContent>
            {dropdownOptions.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    return (
      <Input
        placeholder="Played as"
        value={player.faction ?? ""}
        onChange={(e) => onUpdate({ ...player, faction: e.target.value || undefined })}
        className="flex-1 bg-card border-border"
      />
    );
  };

  return (
    <div className={`p-3 rounded-xl bg-muted/50 border-2 space-y-2 transition-colors ${highlighted ? "border-primary" : "border-border"}`}>
      {/* Row 1: name (half width), score, winner, remove */}
      <div className="flex items-center gap-2">
        <PlayerNameField
          value={player.name}
          onChange={(name) => onUpdate({ ...player, name })}
          suggestions={playerSuggestions}
          colors={playerColors}
        />
        <RepressInput
          placeholder="Score"
          type="number"
          value={player.score ?? ""}
          onChange={(e) => onUpdate({ ...player, score: e.target.value ? Number(e.target.value) : undefined })}
          onActivate={() => setCalcOpen(true)}
          className="flex-1 bg-card border-border [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          <Checkbox
            checked={player.is_winner || false}
            onCheckedChange={(checked) => onUpdate({ ...player, is_winner: !!checked })}
            id={`winner-${index}`}
          />
          <label htmlFor={`winner-${index}`} className="cursor-pointer">
            <Trophy className="w-3.5 h-3.5 text-accent" />
          </label>
        </div>
        {canRemove && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={onRemove}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Row 2: Played As (own line) */}
      {showFactionRow && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Played as</span>
          {factionInput()}
        </div>
      )}

      <ScoreCalculator
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        onConfirm={(val) => {
          onUpdate({ ...player, score: Number(val) });
          setCalcOpen(false);
        }}
      />
    </div>
  );
}