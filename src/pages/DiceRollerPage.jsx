import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dices, X } from "lucide-react";

const DICE = [
{ label: "D4", sides: 4 },
{ label: "D6", sides: 6 },
{ label: "D8", sides: 8 },
{ label: "D10", sides: 10 },
{ label: "D12", sides: 12 },
{ label: "D20", sides: 20 },
{ label: "D100", sides: 100 }];


function roll(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export default function DiceRollerPage() {
  const [result, setResult] = useState(null);
  const [handfulMode, setHandfulMode] = useState(false);
  const [handful, setHandful] = useState([]); // array of {label, sides}

  const rollSingle = (die) => {
    if (handfulMode) {
      setHandful((prev) => [...prev, die]);
    } else {
      setResult({ value: roll(die.sides), label: die.label });
    }
  };

  const rollHandful = () => {
    if (handful.length === 0) return;
    const total = handful.reduce((sum, d) => sum + roll(d.sides), 0);
    const breakdown = handful.map((d) => d.label).join(" + ");
    setResult({ value: total, label: breakdown });
    setHandful([]);
    setHandfulMode(false);
  };

  const toggleHandfulMode = () => {
    if (handfulMode) {
      // cancel
      setHandful([]);
      setHandfulMode(false);
    } else {
      setResult(null);
      setHandful([]);
      setHandfulMode(true);
    }
  };

  const removeFromHandful = (idx) => {
    setHandful((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-8 max-w-lg mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground">Dice Roller</h1>
        
      </div>

      {/* Result display */}
      <div className="flex flex-col items-center justify-center py-6 border-2 border-border rounded-2xl bg-card min-h-[140px]">
        {result ?
        <>
            <p className="text-sm text-muted-foreground font-medium mb-1">{result.label}</p>
            <p className="font-display font-bold text-8xl text-foreground tabular-nums">{result.value}</p>
          </> :
        handfulMode && handful.length === 0 ?
        <p className="text-muted-foreground text-lg font-medium">Choose dice</p> :
        handfulMode && handful.length > 0 ?
        <div className="flex flex-col items-center gap-2 px-4">
            <p className="text-sm text-muted-foreground">Handful</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {handful.map((d, i) =>
            <button
              key={i}
              onClick={() => removeFromHandful(i)}
              className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-sm font-medium border border-primary/30 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors">
              
                  {d.label} <X className="w-3 h-3" />
                </button>
            )}
            </div>
          </div> :

        <p className="text-muted-foreground text-lg font-medium">Roll a die</p>
        }
      </div>

      {/* Dice grid */}
      <div className="grid grid-cols-4 gap-3">
        {DICE.map((die) =>
        <button
          key={die.label}
          onClick={() => rollSingle(die)}
          className="aspect-square flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 active:scale-95 transition-all">
          
            <Dices className="w-7 h-7 text-muted-foreground" />
            <span className="font-display font-bold text-lg text-foreground">{die.label}</span>
          </button>
        )}

        {/* Handful button */}
        <button
          onClick={handfulMode && handful.length > 0 ? rollHandful : toggleHandfulMode}
          className={`aspect-square flex flex-col items-center justify-center gap-1 rounded-2xl border-2 transition-all active:scale-95 ${
          handfulMode && handful.length > 0 ?
          "border-primary bg-primary text-primary-foreground" :
          handfulMode ?
          "border-destructive bg-destructive/10 text-destructive" :
          "border-border bg-card hover:border-primary hover:bg-primary/5 text-foreground"}`
          }>
          
          <span className="text-2xl">{handfulMode && handful.length > 0 ? "🎲" : "✊"}</span>
          <span className="font-display font-bold text-sm">
            {handfulMode && handful.length > 0 ? "Roll!" : handfulMode ? "Cancel" : "Handful"}
          </span>
        </button>
      </div>
    </div>);

}