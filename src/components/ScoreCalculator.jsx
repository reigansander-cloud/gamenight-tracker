import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, CheckCircle2 } from "lucide-react";

// Bottom-sheet calculator. Long-press a score field to open it; the confirmed
// result is returned via onConfirm as a string (ready to drop into the field).
export default function ScoreCalculator({ open, onClose, onConfirm }) {
  const [expr, setExpr] = useState("");

  const liveResult = (() => {
    try {
      const sanitized = expr.replace(/x/g, "*").replace(/[^0-9+\-*/().% ]/g, "");
      if (!sanitized) return null;
      // eslint-disable-next-line no-new-func
      const val = Function('"use strict"; return (' + sanitized + ')')();
      if (isNaN(val) || !isFinite(val)) return null;
      return Math.round(val * 1000) / 1000;
    } catch {
      return null;
    }
  })();

  if (!open) return null;

  const append = (ch) => setExpr((prev) => prev + ch);
  const backspace = () => setExpr((prev) => prev.slice(0, -1));

  const calcKeys = [
    ["7", "8", "9", "/"],
    ["4", "5", "6", "x"],
    ["1", "2", "3", "-"],
    ["0", ".", "(", "+"],
    [")", "C", "⟵", "="],
  ];

  const confirm = () => {
    if (liveResult !== null) onConfirm(String(liveResult));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative z-10 w-full max-w-md bg-popover border border-border rounded-t-2xl shadow-2xl p-4 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground">Score Calculator</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl px-4 py-3 mb-3 min-h-[56px] flex flex-col items-end justify-center bg-muted">
          <span className="text-sm text-muted-foreground truncate max-w-full">{expr || "0"}</span>
          {liveResult !== null && (
            <span className="text-xl font-display font-bold text-foreground">= {liveResult}</span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {calcKeys.flat().map((k, idx) => (
            <button
              key={idx}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                if (k === "C") setExpr("");
                else if (k === "⟵") backspace();
                else if (k === "=") confirm();
                else append(k);
              }}
              className={`h-11 rounded-lg text-base font-semibold transition-colors ${
                k === "="
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : k === "C" || k === "⟵"
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : ["+", "-", "x", "/"].includes(k)
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      : "bg-muted hover:bg-border text-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        <Button className="w-full gap-2" disabled={liveResult === null} onClick={confirm}>
          <CheckCircle2 className="w-4 h-4" /> Use Result ({liveResult ?? "…"})
        </Button>
      </div>
    </div>
  );
}