import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Grid, LayoutGrid } from "lucide-react";
import { useLocation } from "react-router-dom";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateWordGrid() {
  const border = Math.random() < 0.5 ? "red" : "blue";
  const first = border === "red" ? "red" : "blue";
  const second = border === "red" ? "blue" : "red";
  const types = [...Array(9).fill(first), ...Array(8).fill(second), "purple", ...Array(7).fill("neutral")];
  return { border, tiles: shuffle(types).map((type) => ({ type, revealed: false })) };
}

function generatePictureGrid() {
  const border = Math.random() < 0.5 ? "red" : "blue";
  const first = border === "red" ? "red" : "blue";
  const second = border === "red" ? "blue" : "red";
  const types = [...Array(8).fill(first), ...Array(7).fill(second), "purple", ...Array(4).fill("neutral")];
  return { border, tiles: shuffle(types).map((type) => ({ type, revealed: false })) };
}

const TILE_COLORS = {
  red: "bg-red-500 border-red-600",
  blue: "bg-blue-500 border-blue-600",
  purple: "bg-purple-600 border-purple-700",
  neutral: "bg-muted border-border",
};

export default function CodeNames() {
  const [mode, setMode] = useState(null);
  const [grid, setGrid] = useState(null);
  const [picking, setPicking] = useState(true);
  const location = useLocation();

  // Re-open picker when navigated here from the dropdown while already on this page
  useEffect(() => {
    if (location.state?.reopen) {
      setPicking(true);
      window.history.replaceState({}, "");
    }
  }, [location.state?.reopen]);

  const start = useCallback((m) => {
    setMode(m);
    setGrid(m === "words" ? generateWordGrid() : generatePictureGrid());
    setPicking(false);
  }, []);

  const redraw = useCallback(() => {
    setGrid(mode === "words" ? generateWordGrid() : generatePictureGrid());
  }, [mode]);

  const BORDER_LABEL = grid?.border === "red" ? "Red starts" : "Blue starts";
  const gridClass = "grid grid-cols-5 gap-1.5";
  const aspectClass = mode === "words" ? "aspect-[3/2]" : "aspect-square";

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground">Code Names</h1>
          {grid && (
            <p className="text-sm text-muted-foreground">
              <span className={grid.border === "red" ? "text-red-500 font-medium" : "text-blue-500 font-medium"}>{BORDER_LABEL}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {grid && (
            <Button size="sm" onClick={redraw} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Redraw
            </Button>
          )}
        </div>
      </div>

      {/* Mode picker dialog */}
      <Dialog open={picking} onOpenChange={(v) => { if (!v && grid) setPicking(false); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-display">Code Names</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">Choose a game mode</p>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => start("words")}
              className="border-2 border-border rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <Grid className="w-7 h-7 text-muted-foreground" />
              <span className="font-display font-bold text-base">Words</span>
              <span className="text-xs text-muted-foreground text-center">5×5 grid</span>
            </button>
            <button
              onClick={() => start("pictures")}
              className="border-2 border-border rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <LayoutGrid className="w-7 h-7 text-muted-foreground" />
              <span className="font-display font-bold text-base">Pictures</span>
              <span className="text-xs text-muted-foreground text-center">5×4 grid</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grid */}
      {grid && (
        <>
          <div className={`rounded-xl p-1 border-4 ${grid.border === "red" ? "border-red-500" : "border-blue-500"}`}>
            <div className={gridClass}>
              {grid.tiles.map((tile, i) => (
                <div
                  key={i}
                  className={`rounded-lg border-2 ${aspectClass} ${TILE_COLORS[tile.type]}`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 text-xs text-muted-foreground justify-center flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Red team</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Blue team</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-600 inline-block" /> Assassin</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-muted border border-border inline-block" /> Neutral</span>
          </div>
        </>
      )}
    </div>
  );
}