import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

// Game name input that suggests already-logged game names as you type.
export default function GameNameField({ value, onChange, suggestions = [] }) {
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    return suggestions
      .filter((name) => name.toLowerCase() !== q && name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [suggestions, value]);

  const pick = (name) => {
    onChange(name);
    setOpen(false);
  };

  return (
    <div className="relative flex-1 min-w-0">
      <Input
        placeholder="e.g. Catan, Monopoly, Wingspan..."
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="text-base bg-card"
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg border border-border bg-card text-card-foreground shadow-lg max-h-56 overflow-y-auto overscroll-contain">
          {matches.map((name) => (
            <button
              key={name}
              type="button"
              // Select on pointer-down so the tap lands before the input blurs
              onPointerDown={(e) => {
                e.preventDefault();
                pick(name);
              }}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted active:bg-muted/70 transition-colors truncate"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}