import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RotateCcw, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";

const PRESETS = [30, 60, 90, 120, 180, 300];

export default function TimerPage() {
  const [seconds, setSeconds] = useState(60);
  const [duration, setDuration] = useState(60);
  const [running, setRunning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) { clearInterval(intervalRef.current); setRunning(false); return 0; }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const reset = () => { setRunning(false); setSeconds(duration); };

  const [customInput, setCustomInput] = useState("");

  const setDur = (v) => { setDuration(v); setSeconds(v); setRunning(false); setSettingsOpen(false); };

  const handleSetOpen = () => { setCustomInput(""); setSettingsOpen(true); };

  const applyCustom = () => {
    const v = parseInt(customInput, 10);
    if (!isNaN(v) && v > 0) setDur(v);
  };

  const handleCircleClick = () => {
    if (seconds === 0) { reset(); return; }
    setRunning((v) => !v);
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct = duration > 0 ? seconds / duration : 0;
  const circumference = 2 * Math.PI * 90;
  const expired = seconds === 0;

  return (
    <div className="space-y-10 max-w-sm mx-auto text-center">
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground">Turn Timer</h1>
        <p className="text-muted-foreground text-sm mt-1">Tap the circle to start or stop</p>
      </div>

      {/* Clickable circle timer */}
      <div className="flex justify-center">
        <button
          onClick={handleCircleClick}
          className="relative w-64 h-64 rounded-full focus:outline-none active:scale-95 transition-transform"
        >
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
            <circle
              cx="100" cy="100" r="90" fill="none"
              stroke={expired ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct)}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className={`font-display font-bold text-6xl tabular-nums ${expired ? "text-destructive" : "text-foreground"}`}>
              {mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs}s`}
            </span>
            <span className="text-xs text-muted-foreground">
              {expired ? "Time's up!" : running ? "tap to pause" : "tap to start"}
            </span>
          </div>
        </button>
      </div>

      {/* Two buttons only */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" className="gap-2" onClick={reset}>
          <RotateCcw className="w-4 h-4" /> Reset
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleSetOpen}>
          <Settings className="w-4 h-4" /> Set Timer
        </Button>
      </div>

      {/* Set timer dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-display">Set Timer Length</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex gap-2">
              <Input
                autoFocus
                placeholder="Seconds (e.g. 90)"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyCustom()}
                inputMode="numeric"
                className="bg-card"
              />
              <Button onClick={applyCustom}>Set</Button>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setDur(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    duration === p ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {p >= 60 ? `${p / 60}m` : `${p}s`}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}