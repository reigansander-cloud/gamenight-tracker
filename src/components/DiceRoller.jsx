import { useState } from "react";
import { Dices } from "lucide-react";

const DICE = [
  { label: "Coin", sides: 2 },
  { label: "D4", sides: 4 },
  { label: "D6", sides: 6 },
  { label: "D8", sides: 8 },
  { label: "D10", sides: 10 },
  { label: "D12", sides: 12 },
  { label: "D20", sides: 20 },
];

export default function DiceRoller({ open, onClose }) {
  const [result, setResult] = useState(null);
  const [lastDie, setLastDie] = useState(null);

  const roll = (sides, label) => {
    let result;
    if (sides === 2) {
      result = Math.random() < 0.5 ? "Heads" : "Tails";
    } else {
      result = Math.floor(Math.random() * sides) + 1;
    }
    setResult(result);
    setLastDie(label);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[61] bg-card border border-border rounded-2xl shadow-xl p-4 w-72"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Dices className="w-4 h-4" /> Roll Dice
          </span>
          {result !== null && (
            <span className="text-xs text-muted-foreground">{lastDie}: <span className="font-bold text-foreground text-base">{result}</span></span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {DICE.map(({ label, sides }) => (
            <button
              key={label}
              onClick={() => roll(sides, label)}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-xs font-medium text-foreground"
            >
              <span className="text-base font-bold leading-none mb-0.5">{sides === 2 ? "🪙" : sides}</span>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}