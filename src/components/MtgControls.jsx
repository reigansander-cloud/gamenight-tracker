import { useState } from "react";
import { Skull, Droplets } from "lucide-react";

// Full-width button strip shown at the bottom of a player card in MTG mode (normal view)
export function MtgCardButtons({ playerName, commanderDamage, poison, isSlain, bgImage, onCmdClick, onPoisonClick, poisonEditOpen, isPoisonTarget }) {
  const totalCmdDmg = Object.values(commanderDamage).reduce((s, v) => s + (v ?? 0), 0);
  const bg = bgImage ? "bg-black/50 text-white hover:bg-black/65 active:bg-black/75" : "bg-muted/80 text-foreground hover:bg-muted active:bg-border";
  const activeBg = bgImage ? "bg-white/20 text-white" : "bg-primary/10 text-primary";

  return (
    <div className="absolute bottom-0 inset-x-0 z-20 flex flex-row px-1.5 pb-1.5 gap-1.5">
      {/* Poison button — left half */}
      <button
        onClick={onPoisonClick}
        className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${isPoisonTarget ? activeBg : bg}`}
      >
        <Droplets className="w-3 h-3 shrink-0" />
        <span className={`tabular-nums font-bold ${poison >= 10 ? "text-red-400" : ""}`}>
          {poison > 0 ? `${poison}/10` : "0"}
        </span>
      </button>
      {/* Commander Damage button — right half */}
      <button
        onClick={onCmdClick}
        className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${bg}`}
      >
        <Skull className="w-3 h-3 shrink-0" />
        <span className={`tabular-nums font-bold ${totalCmdDmg >= 21 ? "text-red-400" : totalCmdDmg > 0 ? "text-amber-400" : ""}`}>
          {totalCmdDmg > 0 ? totalCmdDmg : "0"}
        </span>
      </button>
    </div>
  );
}

// Shown on OTHER players' cards when a target is selected for commander damage editing
export function CmdDamageEditStrip({ attackerName, targetName, currentDamage, onUpdate, bgImage }) {
  const bg = bgImage
    ? "bg-black/70 backdrop-blur-sm text-white"
    : "bg-card/95 backdrop-blur-sm text-foreground";

  return (
    <div className={`absolute inset-0 z-30 ${bg} flex flex-col items-center justify-center px-4 gap-3`}>
      <p className={`text-xs font-semibold text-center ${bgImage ? "text-white/70" : "text-muted-foreground"}`}>
        Cmd Dmg → {targetName}
      </p>
      <div className="flex items-center justify-between gap-3 w-full">
        <button
          className="flex-1 h-14 rounded-xl bg-destructive/20 text-destructive font-bold text-3xl hover:bg-destructive/30 active:bg-destructive/40"
          onClick={() => onUpdate(Math.max(0, currentDamage - 1))}
        >−</button>
        <span className={`w-14 text-center text-3xl font-display font-bold tabular-nums ${currentDamage >= 21 ? "text-red-400" : bgImage ? "text-white" : "text-foreground"}`}>
          {currentDamage}
        </span>
        <button
          className="flex-1 h-14 rounded-xl bg-primary/20 text-primary font-bold text-3xl hover:bg-primary/30 active:bg-primary/40"
          onClick={() => onUpdate(currentDamage + 1)}
        >+</button>
      </div>
      {currentDamage >= 21 && (
        <p className="text-xs text-red-400 text-center font-semibold">Eliminated!</p>
      )}
    </div>
  );
}

// Poison edit strip — shown on the selected player's own card
export function PoisonEditStrip({ playerName, poison, onUpdate, bgImage, onClose }) {
  const bg = bgImage
    ? "bg-black/70 backdrop-blur-sm text-white"
    : "bg-card/95 backdrop-blur-sm text-foreground";

  return (
    <div className={`absolute inset-0 z-30 ${bg} flex flex-col items-center justify-center px-4 gap-3`}>
      <p className={`text-xs font-semibold text-center ${bgImage ? "text-white/70" : "text-muted-foreground"}`}>
        Poison Counters
      </p>
      <div className="flex items-center justify-between gap-3 w-full">
        <button
          className="flex-1 h-14 rounded-xl bg-destructive/20 text-destructive font-bold text-3xl hover:bg-destructive/30 active:bg-destructive/40"
          onClick={() => onUpdate(Math.max(0, poison - 1))}
        >−</button>
        <span className={`w-14 text-center text-3xl font-display font-bold tabular-nums ${poison >= 10 ? "text-red-400" : bgImage ? "text-white" : "text-foreground"}`}>
          {poison}
        </span>
        <button
          className="flex-1 h-14 rounded-xl bg-primary/20 text-primary font-bold text-3xl hover:bg-primary/30 active:bg-primary/40"
          onClick={() => onUpdate(poison + 1)}
        >+</button>
      </div>
      {poison >= 10 && (
        <p className="text-xs text-red-400 text-center font-semibold">Eliminated by poison!</p>
      )}
      <button
        onClick={onClose}
        className="mt-2 w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-sm font-semibold border border-white/20 transition-colors"
      >
        Done
      </button>
    </div>
  );
}

// Slain overlay
export function SlainOverlay() {
  return (
    <div className="absolute inset-0 z-10 bg-black/60 rounded-2xl pointer-events-none" />
  );
}

// Hook to compute MTG-derived values
export function useMtgState() {
  const [commanderDamage, setCommanderDamage] = useState({});
  const [poison, setPoison] = useState({});

  const updateCommanderDamage = (receiver, attacker, val) => {
    setCommanderDamage((prev) => ({
      ...prev,
      [receiver]: { ...(prev[receiver] ?? {}), [attacker]: val },
    }));
  };

  const updatePoison = (player, val) => {
    setPoison((prev) => ({ ...prev, [player]: Math.max(0, val) }));
  };

  const getCommanderDamageFor = (player) => commanderDamage[player] ?? {};
  const getPoisonFor = (player) => poison[player] ?? 0;

  const getTotalCmdDmg = (player) =>
    Object.values(commanderDamage[player] ?? {}).reduce((s, v) => s + (v ?? 0), 0);

  const isSlain = (player, baseScore) => {
    const displayedLife = baseScore - getTotalCmdDmg(player);
    if (displayedLife <= 0) return true;
    if (getPoisonFor(player) >= 10) return true;
    const cmdDmgMap = commanderDamage[player] ?? {};
    if (Object.values(cmdDmgMap).some((v) => v >= 21)) return true;
    return false;
  };

  const getDisplayedLife = (player, baseScore) => baseScore - getTotalCmdDmg(player);

  const reset = () => {
    setCommanderDamage({});
    setPoison({});
  };

  return {
    updateCommanderDamage,
    updatePoison,
    getCommanderDamageFor,
    getPoisonFor,
    isSlain,
    getDisplayedLife,
    reset,
  };
}