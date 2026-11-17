import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, ChevronDown, Plus } from "lucide-react";
import { isGold, goldFillStyle } from "@/lib/playerColor";

// Dropdown-style player name field. The trigger shows the current name;
// tapping it opens a picker with "New player" at the top for free-text entry.
export default function PlayerNameField({ value, onChange, suggestions = [], colors = {} }) {
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");

  // Player colors keyed case-insensitively so names match profiles reliably
  const colorMap = useMemo(() => {
    const map = {};
    Object.entries(colors).forEach(([name, color]) => {
      if (color) map[name.trim().toLowerCase()] = color;
    });
    return map;
  }, [colors]);

  const close = () => {
    setOpen(false);
    setTyping(false);
    setDraft("");
  };

  const pick = (name) => {
    onChange(name);
    close();
  };

  const confirmNew = () => {
    const name = draft.trim();
    if (name) pick(name);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-1/2 min-w-0 h-9 flex items-center justify-between gap-1 rounded-md border border-border bg-card px-3 shadow-sm text-[16px]"
      >
        <span className={`truncate ${value ? "text-foreground" : "text-muted-foreground"}`}>
          {value || "Player name"}
        </span>
        <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-display text-base">Pick a player</DialogTitle>
          </DialogHeader>

          <div
            className="overflow-y-auto flex-1 min-h-0 -mx-1 px-1 pb-2 space-y-1 overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {typing ? (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="New player name"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmNew()}
                  className="flex-1 bg-card border-border"
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={confirmNew}
                  disabled={!draft.trim()}
                >
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setTyping(true)}
                className="w-full text-left px-3 py-3 rounded-lg border border-dashed border-border hover:bg-muted/50 active:bg-muted/70 text-sm font-medium text-foreground transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> New player
              </button>
            )}

            {suggestions.map((it) => {
              const c = colorMap[it.trim().toLowerCase()];
              return (
                <button
                  key={it}
                  type="button"
                  onClick={() => pick(it)}
                  className="w-full text-left px-3 py-3 rounded-lg bg-muted/50 hover:bg-muted active:bg-muted/70 text-sm font-medium text-foreground transition-colors flex items-center gap-2.5"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                    style={isGold(c) ? goldFillStyle : { backgroundColor: c || "transparent" }}
                  />
                  <span className="truncate">{it}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}