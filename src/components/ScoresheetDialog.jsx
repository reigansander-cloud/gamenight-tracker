import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, X, Delete } from "lucide-react";
import ShrinkText from "@/components/ShrinkText";
import { playerTint } from "@/lib/playerColor";

const YAHTZEE_TOP = ["1's", "2's", "3's", "4's", "5's", "6's"];
const YAHTZEE_BONUS = "BONUS";
const YAHTZEE_BOTTOM = ["3 of a Kind", "4 of a Kind", "Full House", "Sm Straight", "Lg Straight", "YAHTZEE", "Chance"];
const YAHTZEE_FIXED = { "Full House": 25, "Sm Straight": 30, "Lg Straight": 40, "YAHTZEE": 50 };
const YAHTZEE_SPECIAL = Object.keys(YAHTZEE_FIXED);
const CROSS_OUT = "✗";

function parseScore(val) {
  if (val === "" || val === undefined || val === null) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

// --- Numpad (bottom row: - | 0 | ⟵) ---
function Numpad({ onKey }) {
  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["-", "0", "CLR"],
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {keys.flat().map((k) => (
        <button
          key={k}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onKey(k)}
          className={`h-12 rounded-lg text-lg font-semibold transition-colors shadow-sm ${
            k === "CLR"
              ? "bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/30"
              : k === "-"
              ? "bg-muted text-muted-foreground hover:bg-border active:bg-border/70"
              : "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
          }`}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

// --- Calculator popup ---
function Calculator({ onConfirm, onClose }) {
  const [expr, setExpr] = useState("");

  // Live evaluation — convert display 'x' back to '*' for eval
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

  const append = (ch) => setExpr((prev) => prev + ch);
  const backspace = () => setExpr((prev) => prev.slice(0, -1));

  const handleConfirm = () => {
    if (liveResult !== null) onConfirm(String(liveResult));
  };

  // Display keys use 'x'; internally store 'x' and convert on eval
  const calcKeys = [
    ["7", "8", "9", "/"],
    ["4", "5", "6", "x"],
    ["1", "2", "3", "-"],
    ["0", ".", "(", "+"],
    [")", "C", "⟵", "="],
  ];

  return (
    <div className="absolute inset-x-2 bottom-2 z-50 bg-popover border border-border rounded-2xl shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-foreground">Calculator</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>

      {/* Display */}
      <div className="rounded-xl px-4 py-3 mb-3 min-h-[56px] flex flex-col items-end justify-center bg-muted">
        <span className="text-sm text-muted-foreground truncate max-w-full">{expr || "0"}</span>
        {liveResult !== null && (
          <span className="text-xl font-display font-bold text-foreground">= {liveResult}</span>
        )}
      </div>

      {/* Keys */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {calcKeys.flat().map((k, idx) => (
          <button
            key={idx}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              if (k === "C") setExpr("");
              else if (k === "⟵") backspace();
              else if (k === "=") { if (liveResult !== null) onConfirm(String(liveResult)); }
              else append(k);
            }}
            className={`h-11 rounded-lg text-base font-semibold transition-colors ${
              k === "=" ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : k === "C" ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
              : k === "⟵" ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
              : ["+", "-", "x", "/"].includes(k) ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              : "bg-muted hover:bg-border text-foreground"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <Button
        className="w-full gap-2"
        disabled={liveResult === null}
        onClick={handleConfirm}
      >
        <CheckCircle2 className="w-4 h-4" /> Use Result ({liveResult ?? "…"})
      </Button>
    </div>
  );
}

function SpecialScorer({ cat, currentRaw, onChoose }) {
  const num = parseScore(currentRaw);
  const yahtzeeBonus = cat === "YAHTZEE" && num >= 50 && (num - 50) % 100 === 0;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">{cat}</p>
      <div className="flex gap-2">
        {yahtzeeBonus ? (
          <>
            <button type="button" onClick={() => onChoose(CROSS_OUT)} className="flex-1 h-11 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">Clear</button>
            <button type="button" onClick={() => onChoose(String(num + 100))} className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-bold">Add 100 → {num + 100}</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => onChoose(CROSS_OUT)} className="flex-1 h-11 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">Cross out</button>
            <button type="button" onClick={() => onChoose(String(YAHTZEE_FIXED[cat]))} className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-bold">Score {YAHTZEE_FIXED[cat]}</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ScoresheetDialog({ open, onClose, players, gameName, customScoresheets, onFinish, playerColors }) {
  const [categories, setCategories] = useState(["Round 1", "Round 2"]);
  const [scores, setScores] = useState({});
  const [activeCell, setActiveCell] = useState(null); // { player, cat } or null
  const [calcCell, setCalcCell] = useState(null); // { player, cat } — shows calculator
  const scrollRef = useRef(null);
  const holdRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const key = gameName?.trim().toLowerCase();
    if (key && customScoresheets?.[key]?.categories?.length > 0) {
      setCategories(customScoresheets[key].categories);
    } else {
      setCategories(["Round 1", "Round 2"]);
    }
    setScores({});
    setActiveCell(null);
    setCalcCell(null);
  }, [open, gameName]);

  const validPlayers = players.filter((p) => p.name?.trim());

  const isYahtzee = gameName?.trim().toLowerCase() === "yahtzee";

  const getYahtzeeBonus = (player) => {
    const upper = YAHTZEE_TOP.reduce((s, cat) => s + parseScore(scores[player]?.[cat]), 0);
    return upper >= 63 ? 35 : 0;
  };

  const getScore = (player, cat) => {
    if (cat === YAHTZEE_BONUS) return String(getYahtzeeBonus(player));
    return scores[player]?.[cat] ?? "";
  };

  const setScore = useCallback((player, cat, val) => {
    if (val !== "" && val !== "-" && !/^-?\d*(\.\d*)?$/.test(val)) return;
    setScores((prev) => ({
      ...prev,
      [player]: { ...(prev[player] ?? {}), [cat]: val },
    }));
  }, []);

  const getTotal = (player) => {
    const allCats = isYahtzee ? [...YAHTZEE_TOP, YAHTZEE_BONUS, ...YAHTZEE_BOTTOM] : categories;
    return allCats.reduce((sum, cat) => sum + parseScore(getScore(player, cat)), 0);
  };

  const getSectionTotal = (player, cats) => cats.reduce((s, cat) => s + parseScore(getScore(player, cat)), 0);

  const sections = isYahtzee
    ? [
        { name: "Upper", cats: [...YAHTZEE_TOP, YAHTZEE_BONUS], subtotal: true },
        { name: "Lower", cats: YAHTZEE_BOTTOM, subtotal: true },
      ]
    : [{ name: null, cats: categories, subtotal: false }];

  const catCol = isYahtzee ? "w-24 min-w-0 max-w-28" : "w-16 min-w-0 max-w-20";
  const getYahtzeeHint = (cat) => (cat === YAHTZEE_BONUS ? 63 : YAHTZEE_FIXED[cat] ?? null);

  const rows = sections.flatMap((section, sIdx) => [
    ...section.cats.map((cat) => ({ type: "cat", cat })),
    ...(section.subtotal ? [{ type: "subtotal", section }] : []),
    ...(sIdx < sections.length - 1 ? [{ type: "spacer" }] : []),
  ]);

  const addCategory = () => {
    setCategories((prev) => [...prev, `Round ${prev.length + 1}`]);
  };

  const handleFinish = () => {
    const totals = validPlayers.map((p) => ({ name: p.name.trim(), total: getTotal(p.name.trim()) }));
    const maxScore = Math.max(...totals.map((t) => t.total));
    onFinish(totals.map((t) => ({ name: t.name, score: t.total, is_winner: t.total === maxScore })));
    onClose();
  };

  const handleNumpadKey = useCallback(
    (key) => {
      if (!activeCell) return;
      const { player, cat } = activeCell;
      const current = getScore(player, cat);
      if (key === "CLR") {
        setScore(player, cat, "");
      } else if (key === "-") {
        if (current === "-") return;
        setScore(player, cat, current.startsWith("-") ? current.slice(1) : "-" + current);
      } else {
        if (current.length >= 7) return;
        if (current === "0") { setScore(player, cat, key); return; }
        if (current === "-0") { setScore(player, cat, "-" + key); return; }
        setScore(player, cat, current + key);
      }
    },
    [activeCell, getScore, setScore]
  );

  const handleCellPointerDown = (name, cat, i) => {
    if (cat === YAHTZEE_BONUS) return;
    if (YAHTZEE_SPECIAL.includes(cat)) return;
    holdRef.current = setTimeout(() => {
      holdRef.current = null;
      setCalcCell({ player: name, cat });
      setActiveCell({ player: name, cat });
    }, 400);
  };

  const handleCellPointerUp = (name, cat, i) => {
    if (cat === YAHTZEE_BONUS) return;
    const activate = () => {
      setActiveCell({ player: name, cat });
      setCalcCell(null);
      const row = scrollRef.current?.querySelector(`[data-category="${i}"]`);
      if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    if (YAHTZEE_SPECIAL.includes(cat)) { activate(); return; }
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
      activate();
    }
  };

  const handleCellPointerCancel = () => {
    clearTimeout(holdRef.current);
    holdRef.current = null;
  };

  const cellClass =
    "h-8 w-full rounded-md text-sm font-semibold tabular-nums bg-card border border-border hover:bg-muted active:bg-muted/80 transition-colors cursor-pointer select-none";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-2xl h-[95dvh] max-h-[95dvh] flex flex-col overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {gameName || "Game"} Scoresheet
          </DialogTitle>
        </DialogHeader>

        <div ref={scrollRef} className="overflow-y-auto flex-1 min-h-0 relative">
          <table className="w-full table-fixed text-sm border-collapse">
            <thead className="sticky top-0 bg-background z-10">
              <tr>
                <th className={`text-left text-xs font-medium text-muted-foreground py-2 pr-2 ${catCol} whitespace-nowrap`}></th>
                {validPlayers.map((p) => (
                  <th key={p.name} className="text-center text-xs font-medium text-foreground py-2 px-1 truncate w-full min-w-0">
                    {p.name.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                if (row.type === "spacer") {
                  return <tr key={`sp-${i}`} className="h-3"><td colSpan={validPlayers.length + 1} className="bg-background" /></tr>;
                }
                if (row.type === "subtotal") {
                  const section = row.section;
                  return (
                    <tr key={`sub-${i}`} className="border-t border-border/50 bg-muted/20">
                      <td className={`py-1 pr-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate ${catCol}`} title={section.name}>{section.name}</td>
                      {validPlayers.map((p) => {
                        const name = p.name.trim();
                        return (
                          <td key={name} className="py-1 px-1 text-center text-sm font-semibold text-foreground" style={{ backgroundColor: playerTint(playerColors?.[name], 0.08) || undefined }}>
                            {getSectionTotal(name, section.cats)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                }
                const cat = row.cat;
                return (
                  <tr key={`cat-${i}`} className="border-t border-border/50" data-category={i}>
                    <td className={`py-0.5 pr-2 ${catCol}`}>
                      <ShrinkText basePx={12} minPx={8} className="font-medium text-muted-foreground block w-full" title={cat}>{cat}</ShrinkText>
                    </td>
                    {validPlayers.map((p) => {
                      const name = p.name.trim();
                      const isActive = activeCell?.player === name && activeCell?.cat === cat;
                      const raw = getScore(name, cat);
                      const num = parseScore(raw);
                      const isCrossedOut = raw === CROSS_OUT;
                      const isZero = raw === "" || raw === "-" || (num === 0 && !isCrossedOut);
                      const isNeg = num < 0;
                      const isPos = num > 0;
                      const isBonus = cat === YAHTZEE_BONUS;
                      const tint = playerTint(playerColors?.[name], 0.08);
                      const hint = isYahtzee ? getYahtzeeHint(cat) : null;
                      const showHint = isZero && !isCrossedOut && hint != null;
                      if (isBonus) {
                        return (
                          <td key={name} className="py-0.5 px-1">
                            <div className={`${cellClass} flex items-center justify-center`} style={{ backgroundColor: tint || undefined, color: isPos ? "#ffffff" : "hsl(var(--muted-foreground) / 0.4)" }}>
                              {isPos ? num : (hint ?? "\u00A0")}
                            </div>
                          </td>
                        );
                      }
                      return (
                        <td key={name} className="py-0.5 px-1">
                          <button
                            type="button"
                            className={`${cellClass} ${isZero && !isActive && !showHint ? "opacity-40" : ""}`}
                            style={{
                              backgroundColor: isActive ? "hsl(var(--primary) / 0.15)" : tint || undefined,
                              color: isNeg || isCrossedOut ? "#ef4444" : isPos ? "#ffffff" : showHint ? "hsl(var(--muted-foreground) / 0.4)" : undefined,
                              borderColor: isActive ? "hsl(var(--primary))" : undefined,
                              borderWidth: isActive ? "2px" : undefined,
                            }}
                            onPointerDown={() => handleCellPointerDown(name, cat, i)}
                            onPointerUp={() => handleCellPointerUp(name, cat, i)}
                            onPointerLeave={handleCellPointerCancel}
                            onPointerCancel={handleCellPointerCancel}
                          >
                            {isCrossedOut ? "0" : isZero ? (showHint ? hint : "\u00A0") : raw}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              <tr className="border-t-2 border-border bg-muted/30">
                <td className={`py-1.5 pr-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate ${catCol}`} title="Total">Total</td>
                {validPlayers.map((p) => {
                  const name = p.name.trim();
                  const total = getTotal(name);
                  return (
                    <td key={name} className="py-2 px-1 text-center" style={{ backgroundColor: playerTint(playerColors?.[name], 0.08) || undefined }}>
                      <span className="font-display font-bold text-base text-foreground">{total}</span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>

          {/* Calculator popup */}
          {calcCell && (
            <Calculator
              onConfirm={(val) => {
                const { player, cat } = calcCell;
                setScores((prev) => ({
                  ...prev,
                  [player]: { ...(prev[player] ?? {}), [cat]: val },
                }));
                setCalcCell(null);
              }}
              onClose={() => setCalcCell(null)}
            />
          )}
        </div>

        {activeCell && !calcCell && (
          <div className="flex-shrink-0 border-t border-border pt-3 bg-background">
            {YAHTZEE_SPECIAL.includes(activeCell.cat) ? (
              <SpecialScorer
                cat={activeCell.cat}
                currentRaw={getScore(activeCell.player, activeCell.cat)}
                onChoose={(val) => {
                  setScores((prev) => ({
                    ...prev,
                    [activeCell.player]: { ...(prev[activeCell.player] ?? {}), [activeCell.cat]: val },
                  }));
                  setActiveCell(null);
                }}
              />
            ) : (
              <Numpad onKey={handleNumpadKey} />
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 gap-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addCategory} className="gap-1.5 text-xs h-7 px-2">
              <Plus className="w-3 h-3" /> Category
            </Button>
            {activeCell && (
              <Button type="button" variant="outline" size="sm" onClick={() => { setActiveCell(null); setCalcCell(null); }} className="gap-1.5 text-xs h-7 px-2">
                <X className="w-3 h-3" /> Close
              </Button>
            )}
          </div>
          <Button type="button" onClick={handleFinish} className="gap-2">
            <CheckCircle2 className="w-4 h-4" /> Finish Scoring
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}