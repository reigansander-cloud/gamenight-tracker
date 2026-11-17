import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shuffle, Plus, X } from "lucide-react";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function RandomizerPage() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [mode, setMode] = useState("order"); // "order" | "pick"
  const [picked, setPicked] = useState(null);

  const addItem = () => {
    const v = newItem.trim();
    if (v) { setItems((prev) => [...prev, v]); setNewItem(""); setPicked(null); }
  };

  const removeItem = (i) => { setItems((prev) => prev.filter((_, idx) => idx !== i)); setPicked(null); };

  const run = () => {
    if (items.length === 0) return;
    if (mode === "order") {
      setItems(shuffle(items));
      setPicked(null);
    } else {
      setPicked(items[Math.floor(Math.random() * items.length)]);
    }
  };

  return (
    <div className="space-y-6 max-w-sm mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground">Randomizer</h1>
        <p className="text-muted-foreground text-sm mt-1">Shuffle players or pick someone at random</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 bg-muted rounded-xl p-1">
        {["order", "pick"].map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setPicked(null); }}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {m === "order" ? "Shuffle Order" : "Pick One"}
          </button>
        ))}
      </div>

      {/* Player list */}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className={`flex items-center gap-2 border rounded-lg px-3 py-2 transition-colors ${picked === item ? "bg-primary/10 border-primary" : "bg-card border-border"}`}>
            
            <span className="text-sm flex-1 text-foreground font-medium">{item}</span>
            <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            placeholder="Add name..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            className="bg-card"
          />
          <Button variant="outline" size="icon" onClick={addItem}><Plus className="w-4 h-4" /></Button>
        </div>
      </div>

      <Button className="w-full gap-2" onClick={run} disabled={items.length === 0}>
        <Shuffle className="w-4 h-4" /> {mode === "order" ? "Shuffle" : "Pick Random"}
      </Button>

      {mode === "pick" && picked && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Selected</p>
          <p className="font-display font-bold text-2xl text-primary">{picked}</p>
        </div>
      )}
    </div>
  );
}