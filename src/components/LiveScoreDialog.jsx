import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, X, Trophy, ImagePlus, Flag, Dices, Sword, Settings2, Minus as MinusIcon, Skull } from "lucide-react";
import { base44 } from "@/api/base44Client";
import DiceRoller from "@/components/DiceRoller";
import { MtgCardButtons, CmdDamageEditStrip, PoisonEditStrip, SlainOverlay, useMtgState } from "@/components/MtgControls";
import { isGold, goldFillStyle } from "@/lib/playerColor";

const SKULL_ICON_URL = "https://lh3.googleusercontent.com/d/1hruhRMxg86lUvgzBqToDoFnHVfuyu7ab";

function loadCardImages() {
  try { return JSON.parse(localStorage.getItem("liveScoreCardImages") || "{}"); } catch { return {}; }
}
function saveCardImages(obj) { localStorage.setItem("liveScoreCardImages", JSON.stringify(obj)); }

function loadCardColors() {
  try { return JSON.parse(localStorage.getItem("liveScoreCardColors") || "{}"); } catch { return {}; }
}
function saveCardColors(obj) { localStorage.setItem("liveScoreCardColors", JSON.stringify(obj)); }

// --- Setup screen ---
function SetupScreen({ players, gameName, customStartingPoints, onLaunch, onCancel }) {
  const key = gameName?.trim().toLowerCase();
  const defaultStart = customStartingPoints?.[key]?.startingScore ?? 0;
  const [starts, setStarts] = useState({});

  useEffect(() => {
    const init = {};
    players.forEach((p) => { init[p.name.trim()] = String(defaultStart); });
    setStarts(init);
  }, [players, defaultStart]);

  const handleLaunch = () => {
    const scores = {};
    players.forEach((p) => {
      const name = p.name.trim();
      scores[name] = Number(starts[name]) || 0;
    });
    onLaunch(scores);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {players.map((p) => {
          const name = p.name.trim();
          return (
            <div key={name} className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground w-32 truncate">{name}</span>
              <Input className="h-8 w-24 text-center bg-card" value={starts[name] ?? "0"} onChange={(e) => setStarts({ ...starts, [name]: e.target.value })} inputMode="numeric" />
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}><X className="w-4 h-4 mr-2" /> Cancel</Button>
        <Button type="button" className="flex-1 gap-2" onClick={handleLaunch}><Play className="w-4 h-4" /> Launch Game</Button>
      </div>
    </div>
  );
}

// --- Sideways wrapper ---
function SidewaysCard({ rotation, children }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ containerType: "size" }}>
      <div style={{ position: "absolute", top: "50%", left: "50%", width: "100cqh", height: "100cqw", transform: `translate(-50%, -50%) rotate(${rotation}deg)`, transformOrigin: "center center" }}>
        {children}
      </div>
    </div>
  );
}

// --- Player score card ---
function ScoreCard({ name, score, onScoreChange, bgImage, bgColor, onImageUpload, onColorSelect, quickMode, isStartingPlayer, flagFlash, isHighlighted, mtgMode, mtgOverlay, onTrophyClick, pickingWinner, allowNegative, drainPulse }) {
  const holdRef = useRef(null);
  const holdFiredRef = useRef(false);
  const [active, setActive] = useState(null); // "left" | "right" | null — for manual active styling
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const fileInputRef = useRef(null);

  const [delta, setDelta] = useState(0);
  const [deltaVisible, setDeltaVisible] = useState(false);
  const deltaTimerRef = useRef(null);
  const pendingDeltaRef = useRef(0);

  const showDelta = (change) => {
    pendingDeltaRef.current += change;
    setDelta(pendingDeltaRef.current);
    setDeltaVisible(true);
    clearTimeout(deltaTimerRef.current);
    deltaTimerRef.current = setTimeout(() => {
      setDeltaVisible(false);
      pendingDeltaRef.current = 0;
    }, 1800);
  };

  const lastDrainRef = useRef(0);
  useEffect(() => {
    if (!drainPulse || drainPulse.nonce === lastDrainRef.current) return;
    lastDrainRef.current = drainPulse.nonce;
    const d = drainPulse.deltas?.[name];
    if (d) showDelta(d);
  }, [drainPulse]);

  const scoreRef = useRef(score);
  scoreRef.current = score;

  const applyChange = (current, change) => {
    if (change < 0 && !allowNegative && current <= 0) return undefined;
    if (change < 0 && !allowNegative) return Math.max(0, current + change);
    return current + change;
  };

  const cancelHold = () => {
    clearTimeout(holdRef.current);
    clearInterval(holdRef.current);
  };

  const startHold = (side, e) => {
    e.preventDefault();
    holdFiredRef.current = false;
    setActive(side);
    holdRef.current = setTimeout(() => {
      holdFiredRef.current = true;
      const change = side === "left" ? -10 : 10;
      const next = applyChange(scoreRef.current, change);
      if (next === undefined) { setActive(null); return; }
      onScoreChange(next);
      showDelta(next - scoreRef.current);
      holdRef.current = setInterval(() => {
        const nextVal = applyChange(scoreRef.current, change);
        if (nextVal === undefined) return;
        const d = nextVal - scoreRef.current;
        onScoreChange(nextVal);
        showDelta(d);
      }, 300);
    }, 400);
  };

  const endHold = (side) => {
    cancelHold();
    setActive(null);
    if (editing || holdFiredRef.current) return;
    const change = side === "left" ? -1 : 1;
    const next = applyChange(scoreRef.current, change);
    if (next === undefined) return;
    onScoreChange(next);
    showDelta(next - scoreRef.current);
  };

  const scoreHoldRef = useRef(null);
  const scoreHoldFiredRef = useRef(false);

  const startScoreHold = (e) => {
    e.preventDefault();
    scoreHoldFiredRef.current = false;
    scoreHoldRef.current = setTimeout(() => {
      scoreHoldFiredRef.current = true;
      setEditVal(String(scoreRef.current));
      setEditing(true);
    }, 400);
  };

  const cancelScoreHold = () => { clearTimeout(scoreHoldRef.current); };

  const handleScoreTap = () => {
    cancelScoreHold();
    if (scoreHoldFiredRef.current) return;
    onScoreChange(scoreRef.current + 1);
    showDelta(1);
  };

  const commitEdit = () => {
    const n = Number(editVal);
    if (!isNaN(n)) onScoreChange(n);
    setEditing(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setShowColorPicker(false);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onImageUpload(file_url);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const hasBg = bgImage || bgColor;
  const goldCard = isGold(bgColor) && !bgImage;
  // Gold is a metallic gradient, so keep dark text on it for contrast
  const lightText = hasBg && !goldCard;
  const cardStyle = bgColor && !bgImage ? (goldCard ? goldFillStyle : { backgroundColor: bgColor }) : {};

  const imageStyle = bgImage
    ? { backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
    : {};

  const sideButtonClass = (side) =>
    `flex-1 flex items-center justify-center text-4xl font-light transition-colors select-none touch-none ${bgImage ? "text-white/80" : "text-muted-foreground"} ${active === side ? "bg-black/20" : ""}`;

  return (
    <div
      className={`relative border-2 rounded-2xl overflow-hidden select-none touch-none flex flex-col transition-colors h-full w-full ${isHighlighted ? "border-primary ring-2 ring-primary/50" : isStartingPlayer ? "border-primary" : "border-transparent"}`}
      style={{ ...cardStyle, ...imageStyle }}
    >
      {bgImage && <div className="absolute inset-0 bg-black/20 rounded-2xl" />}
      {!hasBg && <div className="absolute inset-0 bg-card rounded-2xl" />}

      {!quickMode && (
        <>
          <div className={`relative z-10 px-3 text-center ${mtgMode ? "pt-1 pb-0.5" : "pt-2 pb-1"}`}>
            <button className="group flex items-center justify-center gap-1.5 w-full" onClick={() => setShowColorPicker((v) => !v)} type="button">
              <p className={`text-sm font-medium truncate ${lightText ? "text-white" : "text-foreground"}`}>{name}</p>
              <ImagePlus className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0 ${lightText ? "text-white" : "text-muted-foreground"}`} />
            </button>
            {uploading && <p className="text-xs text-muted-foreground mt-0.5">Uploading…</p>}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          {showColorPicker && (
            <div className="absolute inset-x-2 top-8 z-50 bg-popover border border-border rounded-xl shadow-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Background</p>
              <div className="flex items-center gap-2 mb-2">
                <label className="flex-1 flex items-center gap-2 cursor-pointer text-xs text-foreground font-medium bg-muted hover:bg-muted/80 rounded-lg px-2 py-1.5">
                  <span className="w-6 h-6 rounded-full border-2 border-border shrink-0 overflow-hidden">
                    <input type="color" className="w-8 h-8 -ml-1 -mt-1 cursor-pointer border-none bg-transparent" value={bgColor || "#334155"} onChange={(e) => onColorSelect(e.target.value)} />
                  </span>
                  Pick color
                </label>
                {bgColor && <button onClick={() => onColorSelect(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg bg-muted hover:bg-muted/80">Clear</button>}
              </div>
              <button onClick={() => { fileInputRef.current?.click(); setShowColorPicker(false); }} className="w-full text-xs py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium flex items-center justify-center gap-1.5 mb-2">
                <ImagePlus className="w-3 h-3" /> Upload image
              </button>
              <button onClick={() => setShowColorPicker(false)} className="w-full text-xs py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center">Done</button>
            </div>
          )}
        </>
      )}

      {editing ? (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-3 px-4 pb-5">
          <Input autoFocus className={`h-16 text-center text-4xl font-display font-bold bg-muted w-full ${Number(editVal) <= 0 ? "text-red-500" : ""}`} value={editVal} onChange={(e) => setEditVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commitEdit()} inputMode="numeric" />
          <Button size="sm" className="w-full" onClick={commitEdit}>Set</Button>
        </div>
      ) : (
        <div className={`relative z-10 flex flex-1 min-h-0 ${mtgMode ? "pb-10" : ""}`}>
          <button
            className={sideButtonClass("left")}
            onPointerDown={(e) => startHold("left", e)}
            onPointerUp={() => endHold("left")}
            onPointerLeave={() => { cancelHold(); setActive(null); }}
            onPointerCancel={() => { cancelHold(); setActive(null); }}
          >−</button>
          <div className="flex flex-col items-center justify-center px-3 flex-shrink-0">
            <span className={`text-2xl font-bold tabular-nums drop-shadow-lg pointer-events-none transition-opacity duration-300 ${deltaVisible ? "opacity-100" : "opacity-0"} ${delta >= 0 ? "text-green-400" : "text-red-400"}`}>
              {delta >= 0 ? `+${delta}` : delta}
            </span>
            <button className="flex items-center justify-center touch-none" onPointerDown={startScoreHold} onPointerUp={handleScoreTap} onPointerLeave={cancelScoreHold} onPointerCancel={cancelScoreHold} type="button">
              <span className={`font-display font-bold text-6xl tabular-nums ${score <= 0 ? "text-red-500" : lightText ? "text-white" : "text-foreground"}`}>{score}</span>
            </button>
          </div>
          <button
            className={sideButtonClass("right")}
            onPointerDown={(e) => startHold("right", e)}
            onPointerUp={() => endHold("right")}
            onPointerLeave={() => { cancelHold(); setActive(null); }}
            onPointerCancel={() => { cancelHold(); setActive(null); }}
          >+</button>
        </div>
      )}

      {isStartingPlayer && flagFlash && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-black/50 rounded-2xl">
          <Flag className="w-24 h-24 text-primary drop-shadow-2xl animate-pulse" />
        </div>
      )}

      {mtgMode && mtgOverlay}

      {pickingWinner && (
        <button className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-black/60 rounded-2xl" onClick={onTrophyClick}>
          <Trophy className="w-10 h-10 text-yellow-400 drop-shadow-lg" />
          <span className="text-sm font-bold text-white">{name}</span>
        </button>
      )}
    </div>
  );
}

// --- Settings sheet overlay ---
function SettingsSheet({ open, onClose, mtgMode, onToggleMtg, allowNegative, onToggleNegative, onRandomizeStartingPlayer, diceOpen, onToggleDice, bloodbathEnabled, onToggleBloodbath }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="bg-background border-t border-border rounded-t-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold text-muted-foreground mb-1">Game Settings</p>

        <button
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${mtgMode ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-foreground"}`}
          onClick={onToggleMtg}
        >
          <Sword className="w-5 h-5 shrink-0" />
          <div className="text-left">
            <p className="font-medium text-sm">MTG Mode</p>
            <p className={`text-xs ${mtgMode ? "text-primary-foreground/70" : "text-muted-foreground"}`}>Commander damage &amp; poison counters</p>
          </div>
          <span className={`ml-auto text-xs font-bold ${mtgMode ? "text-primary-foreground" : "text-muted-foreground"}`}>{mtgMode ? "ON" : "OFF"}</span>
        </button>

        <button
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${allowNegative ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-foreground"}`}
          onClick={onToggleNegative}
        >
          <MinusIcon className="w-5 h-5 shrink-0" />
          <div className="text-left">
            <p className="font-medium text-sm">Allow Negative Scores</p>
            <p className={`text-xs ${allowNegative ? "text-primary-foreground/70" : "text-muted-foreground"}`}>Scores can go below zero</p>
          </div>
          <span className={`ml-auto text-xs font-bold ${allowNegative ? "text-primary-foreground" : "text-muted-foreground"}`}>{allowNegative ? "ON" : "OFF"}</span>
        </button>

        <button
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${bloodbathEnabled ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-foreground"}`}
          onClick={onToggleBloodbath}
        >
          <Skull className="w-5 h-5 shrink-0" />
          <div className="text-left">
            <p className="font-medium text-sm">Bloodbath Button</p>
            <p className={`text-xs ${bloodbathEnabled ? "text-primary-foreground/70" : "text-muted-foreground"}`}>Drain all players at once</p>
          </div>
          <span className={`ml-auto text-xs font-bold ${bloodbathEnabled ? "text-primary-foreground" : "text-muted-foreground"}`}>{bloodbathEnabled ? "ON" : "OFF"}</span>
        </button>

        <button
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${diceOpen ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-foreground"}`}
          onClick={onToggleDice}
        >
          <Dices className="w-5 h-5 shrink-0" />
          <p className="font-medium text-sm">Dice Roller</p>
        </button>

        <Button variant="outline" className="w-full mt-1" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

// --- Main dialog ---
export default function LiveScoreDialog({ open, onClose, players, gameName, customStartingPoints, onFinish, quickMode = false, playerColors, onColorChange, playerBgs, onBgChange }) {
  const [phase, setPhase] = useState("setup");
  const [scores, setScores] = useState({});
  const [cardImages, setCardImages] = useState(loadCardImages);
  const [cardColors, setCardColors] = useState(loadCardColors);
  const [startingPlayer, setStartingPlayer] = useState(null);
  const [flagFlash, setFlagFlash] = useState(false);
  const [diceOpen, setDiceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mtgMode, setMtgMode] = useState(false);
  const [allowNegative, setAllowNegative] = useState(false);
  const [bloodbathEnabled, setBloodbathEnabled] = useState(false);
  const [pickingWinner, setPickingWinner] = useState(false);
  const [winner, setWinner] = useState(null);
  const [playAgainToast, setPlayAgainToast] = useState(false);
  const [cmdEditTarget, setCmdEditTarget] = useState(null);
  const [poisonEditTarget, setPoisonEditTarget] = useState(null);

  const mtg = useMtgState();
  const validPlayers = players.filter((p) => p.name?.trim());
  const isMoonColony = gameName?.trim().toLowerCase() === "moon colony bloodbath";
  const drainHoldRef = useRef(null);
  const drainFiredRef = useRef(false);
  const scoresRef = useRef(scores);
  scoresRef.current = scores;
  const [drainPulse, setDrainPulse] = useState({ nonce: 0, deltas: {} });
  const drainNonceRef = useRef(0);

  const toggleMtgMode = () => {
    setMtgMode((prev) => !prev);
    setCmdEditTarget(null);
    setPoisonEditTarget(null);
    setPickingWinner(false);
    setWinner(null);
  };

  const exitMtgEdit = () => { setCmdEditTarget(null); setPoisonEditTarget(null); };

  useEffect(() => {
    if (!open) return;
    mtg.reset();
    setPickingWinner(false);
    setWinner(null);
    setSettingsOpen(false);
    const isMagic = ["magic", "magic: the gathering", "mtg"].includes(gameName?.trim().toLowerCase());
    setMtgMode(isMagic);
    const key = gameName?.trim().toLowerCase();
    const templateStart = customStartingPoints?.[key]?.startingScore;
    const hasExistingScores = validPlayers.some((p) => p.score != null && p.score !== undefined && p.score !== "");

    const templateAllowNeg = customStartingPoints?.[key]?.allowNegative ?? false;
    setAllowNegative(templateAllowNeg);
    setBloodbathEnabled(isMoonColony);

    // Always launch directly — setup screen only showed for custom starting scores, which are now auto-applied
    const init = {};
    validPlayers.forEach((p) => {
      const name = p.name.trim();
      init[name] = hasExistingScores && p.score != null ? Number(p.score) : Number(templateStart) || 0;
    });
    setScores(init);
    // Initialize card colors & backgrounds from player profiles
    const colorInit = {};
    const bgInit = {};
    validPlayers.forEach((p) => {
      const name = p.name.trim();
      colorInit[name] = playerColors?.[name] || null;
      bgInit[name] = playerBgs?.[name] || null;
    });
    setCardColors(colorInit);
    setCardImages(bgInit);
    setPhase("live");
  }, [open]);

  const updateScore = (name, val) => setScores((prev) => ({ ...prev, [name]: val }));

  const drainAll = (amount) => {
    const prev = scoresRef.current;
    const next = { ...prev };
    const deltas = {};
    Object.keys(next).forEach((name) => {
      const v = Number(next[name]) || 0;
      const nv = allowNegative ? v - amount : Math.max(0, v - amount);
      deltas[name] = nv - v;
      next[name] = nv;
    });
    setScores(next);
    setDrainPulse({ nonce: (drainNonceRef.current += 1), deltas });
  };

  const startDrainHold = (e) => {
    e.stopPropagation();
    e.preventDefault();
    drainFiredRef.current = false;
    drainHoldRef.current = setTimeout(() => {
      drainFiredRef.current = true;
      drainAll(5);
      drainHoldRef.current = setInterval(() => drainAll(5), 300);
    }, 400);
  };

  const cancelDrainHold = () => {
    clearTimeout(drainHoldRef.current);
    clearInterval(drainHoldRef.current);
    drainHoldRef.current = null;
  };

  const endDrainHold = (e) => {
    e?.stopPropagation?.();
    const fired = drainFiredRef.current;
    cancelDrainHold();
    if (!fired) drainAll(1);
  };

  const randomizeStartingPlayer = () => {
    const names = validPlayers.map((p) => p.name.trim());
    if (names.length === 0) return;
    setStartingPlayer(names[Math.floor(Math.random() * names.length)]);
    setFlagFlash(true);
    setTimeout(() => setFlagFlash(false), 1200);
  };

  const handleImageUpload = (name, url) => {
    const updated = { ...cardImages, [name]: url };
    setCardImages(updated);
    saveCardImages(updated);
    setCardColors((prev) => { const u = { ...prev, [name]: null }; saveCardColors(u); return u; });
    if (onColorChange) onColorChange(name, null);
    if (onBgChange) onBgChange(name, url);
  };

  const handleColorSelect = (name, color) => {
    const updatedColors = { ...cardColors, [name]: color };
    setCardColors(updatedColors);
    saveCardColors(updatedColors);
    if (onColorChange) onColorChange(name, color);
    if (color !== null) {
      const updatedImages = { ...cardImages, [name]: null };
      setCardImages(updatedImages);
      saveCardImages(updatedImages);
      if (onBgChange) onBgChange(name, null);
    }
  };

  const handleFinish = () => {
    if (!mtgMode) {
      // Auto-pick winner(s) by highest score
      const scoreEntries = validPlayers.map((p) => ({ name: p.name.trim(), score: scores[p.name.trim()] ?? 0 }));
      const maxScore = Math.max(...scoreEntries.map((e) => e.score));
      const winners = scoreEntries.filter((e) => e.score === maxScore).map((e) => e.name);
      setWinner(winners.join(" & "));
      setPickingWinner(false);
    } else {
      setPickingWinner(true);
      setWinner(null);
    }
  };

  const handleWinnerPicked = (winnerName) => {
    if (quickMode) {
      if (onFinish) {
        onFinish(validPlayers.map((p) => {
          const name = p.name.trim();
          return { name, score: mtgMode ? undefined : (scores[name] ?? 0), is_winner: name === winnerName };
        }));
      }
      setPickingWinner(false);
    } else {
      setWinner(winnerName);
    }
  };

  const handleLogScore = () => {
    const w = winner;
    setPickingWinner(false);
    setWinner(null);
    onClose();
    if (onFinish) {
      onFinish(validPlayers.map((p) => {
        const name = p.name.trim();
        return { name, score: mtgMode ? undefined : (scores[name] ?? 0), is_winner: name === w };
      }), true);
    }
  };

  const handleLogAndPlayAgain = async () => {
    const w = winner;
    const key = gameName?.trim().toLowerCase();
    const templateStart = customStartingPoints?.[key]?.startingScore;
    const startingScore = mtgMode ? 40 : (templateStart != null ? Number(templateStart) : 0);
    await base44.entities.GameLog.create({
      game_name: gameName || "Game",
      date_played: new Date().toISOString().split("T")[0],
      players: validPlayers.map((p) => {
        const name = p.name.trim();
        return { name, score: mtgMode ? null : (scores[name] ?? 0), is_winner: name === w };
      }),
    });
    const fresh = {};
    validPlayers.forEach((p) => { fresh[p.name.trim()] = startingScore; });
    setScores(fresh);
    if (mtgMode) mtg.reset();
    setPickingWinner(false);
    setWinner(null);
    setPlayAgainToast(true);
    setTimeout(() => setPlayAgainToast(false), 2000);
  };

  const scoreValues = Object.values(scores);
  const maxScore = scoreValues.length > 0 ? Math.max(...scoreValues) : null;
  const count = validPlayers.length;
  const sideways = count >= 3;

  const cols = count <= 2 ? 1 : 2;
  const rows = count <= 2 ? count : Math.ceil(count / 2); // used for 1-2 player grid rows

  // For 3+ players in a 2-col grid, arrange clockwise:
  // Left column faces right (90°), right column faces left (270°).
  // Clockwise order starting bottom-left: left col bottom→top, then right col top→bottom.
  // For odd player counts, the last player (final in list) spans both columns at the bottom, facing normally (0°).
  const isOdd = count >= 3 && count % 2 !== 0;
  const sideCount = isOdd ? count - 1 : count; // players placed sideways
  const sideRows = Math.ceil(sideCount / 2);

  const { orderedPlayers, gridRotations, spanLast } = (() => {
    if (count === 1) return { orderedPlayers: validPlayers, gridRotations: [0], spanLast: false };
    if (count === 2) return { orderedPlayers: validPlayers, gridRotations: [180, 0], spanLast: false };

    const sidePlayers = validPlayers.slice(0, sideCount);
    const lastPlayer = isOdd ? validPlayers[count - 1] : null;

    // Build left and right column grid slot indices for side players
    const leftSlots = [];
    const rightSlots = [];
    for (let r = 0; r < sideRows; r++) {
      leftSlots.push(r * 2);
      if (r * 2 + 1 < sideCount) rightSlots.push(r * 2 + 1);
    }

    // Clockwise: left col bottom→top, right col top→bottom
    const clockwiseSlots = [...leftSlots].reverse().concat(rightSlots);

    const gridPlayers = new Array(sideCount);
    const gridRots = new Array(sideCount);
    clockwiseSlots.forEach((slot, cwIdx) => {
      if (cwIdx < sideCount) {
        gridPlayers[slot] = sidePlayers[cwIdx];
        gridRots[slot] = slot % 2 === 0 ? 90 : 270;
      }
    });

    const finalPlayers = gridPlayers.filter(Boolean);
    const finalRots = gridRots.filter((_, i) => gridPlayers[i] !== undefined);

    if (lastPlayer) {
      finalPlayers.push(lastPlayer);
      finalRots.push(0);
    }

    return { orderedPlayers: finalPlayers, gridRotations: finalRots, spanLast: isOdd };
  })();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-full h-[100dvh] max-h-[100dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-none sm:rounded-none [&>button]:hidden" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>

        {phase === "setup" ? (
          <>
            <DialogHeader className="px-5 pt-5 pb-3 flex-shrink-0">
              <DialogTitle className="font-display text-lg">Live Score — {gameName || "Game"}</DialogTitle>
            </DialogHeader>
            <div className="px-5 pb-5">
              <SetupScreen players={validPlayers} gameName={gameName} customStartingPoints={customStartingPoints} onLaunch={(s) => { setScores(s); setPhase("live"); }} onCancel={onClose} />
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">

            {playAgainToast && (
              <div className="absolute top-4 inset-x-0 z-50 flex justify-center pointer-events-none">
                <div className="bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg">Game logged! New round started 🎲</div>
              </div>
            )}

            {/* Winner confirm overlay */}
            {winner && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/75 gap-5 px-8">
                <Trophy className="w-14 h-14 text-yellow-400 drop-shadow-lg" />
                <p className="text-2xl font-display font-bold text-white text-center">{winner} Won!</p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <Button className="w-full gap-2" onClick={handleLogScore}><Trophy className="w-4 h-4" /> Log Score</Button>
                  <Button variant="outline" className="w-full gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={handleLogAndPlayAgain}>Log &amp; Play Again</Button>
                  <Button variant="ghost" className="w-full text-white/70 hover:text-white hover:bg-white/10" onClick={() => { setWinner(null); setPickingWinner(false); }}>Cancel</Button>
                </div>
              </div>
            )}

            {/* "Who Won?" banner */}
            {pickingWinner && !winner && (
              <div className="absolute top-0 inset-x-0 z-40 flex items-center justify-center py-2 bg-black/70 pointer-events-none">
                <p className="text-white font-bold text-base font-display">Who Won?</p>
              </div>
            )}

            {/* Score grid */}
            <div className="relative flex-1 min-h-0 grid p-1 gap-1" style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: count <= 2
                ? `repeat(${rows}, 1fr)`
                : spanLast
                  ? `repeat(${sideRows}, 1fr) 0.65fr`
                  : `repeat(${sideRows}, 1fr)`
            }}>
              {orderedPlayers.map((p, i) => {
                const name = p.name.trim();
                const cmdDmg = mtg.getCommanderDamageFor(name);
                const displayedScore = mtgMode ? mtg.getDisplayedLife(name, scores[name] ?? 0) : (scores[name] ?? 0);
                const slain = mtgMode && mtg.isSlain(name, scores[name] ?? 0);
                const bgImage = cardImages[name] || null;
                const bgColor = cardColors[name] || null;
                const isTheCmdTarget = mtgMode && cmdEditTarget === name;
                const isAttackerCard = mtgMode && cmdEditTarget !== null && cmdEditTarget !== name;
                const isPoisonTarget = mtgMode && poisonEditTarget === name;
                const inAnyEditMode = cmdEditTarget !== null || poisonEditTarget !== null;

                const card = (
                  <ScoreCard
                    name={name}
                    score={displayedScore}
                    allowNegative={allowNegative}
                    drainPulse={drainPulse}
                    onScoreChange={(v) => {
                      if (mtgMode) {
                        const totalCmd = Object.values(cmdDmg).reduce((s, x) => s + (x ?? 0), 0);
                        updateScore(name, v + totalCmd);
                      } else {
                        updateScore(name, v);
                      }
                    }}
                    bgImage={bgImage}
                    bgColor={bgColor}
                    onImageUpload={(url) => handleImageUpload(name, url)}
                    onColorSelect={(color) => handleColorSelect(name, color)}
                    quickMode={quickMode}
                    isStartingPlayer={startingPlayer === name}
                    flagFlash={flagFlash}
                    isHighlighted={isTheCmdTarget || isPoisonTarget}
                    mtgMode={mtgMode}
                    pickingWinner={pickingWinner && !winner}
                    onTrophyClick={() => handleWinnerPicked(name)}
                    mtgOverlay={
                      <>
                        {slain && <SlainOverlay />}
                        {!inAnyEditMode && (
                          <MtgCardButtons playerName={name} commanderDamage={cmdDmg} poison={mtg.getPoisonFor(name)} bgImage={bgImage}
                            onCmdClick={() => { setCmdEditTarget(name); setPoisonEditTarget(null); }}
                            onPoisonClick={() => { setPoisonEditTarget(name); setCmdEditTarget(null); }}
                          />
                        )}
                        {isTheCmdTarget && (
                          <div className="absolute inset-0 z-20 cursor-pointer bg-primary/10 flex flex-col items-center justify-center gap-2" onClick={exitMtgEdit}>
                            <span className="text-xs font-bold text-white/90 bg-black/50 px-4 py-2 rounded-full">Tap to exit edit mode</span>
                          </div>
                        )}
                        {isPoisonTarget && (
                          <>
                            <div className="absolute inset-0 z-19 cursor-pointer" onClick={exitMtgEdit} />
                            <PoisonEditStrip playerName={name} poison={mtg.getPoisonFor(name)} onUpdate={(val) => mtg.updatePoison(name, val)} bgImage={bgImage} onClose={exitMtgEdit} />
                          </>
                        )}
                        {isAttackerCard && (
                          <CmdDamageEditStrip attackerName={name} targetName={cmdEditTarget} currentDamage={mtg.getCommanderDamageFor(cmdEditTarget)[name] ?? 0} onUpdate={(val) => mtg.updateCommanderDamage(cmdEditTarget, name, val)} bgImage={bgImage} />
                        )}
                      </>
                    }
                  />
                );

                return (
                  <div key={name} className={`relative overflow-hidden rounded-2xl h-full w-full ${spanLast && i === orderedPlayers.length - 1 ? "col-span-2" : ""}`}>
                    {gridRotations[i] === 180
                      ? <div className="h-full w-full" style={{ transform: "rotate(180deg)" }}>{card}</div>
                      : sideways && gridRotations[i] !== 0
                        ? <SidewaysCard rotation={gridRotations[i]}>{card}</SidewaysCard>
                        : <div className="h-full w-full">{card}</div>}
                  </div>
                );
              })}

              {bloodbathEnabled && (
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                  <button
                    type="button"
                    className="pointer-events-auto w-28 h-28 rounded-full bg-primary text-primary-foreground shadow-2xl active:bg-primary/90 select-none touch-none flex items-center justify-center overflow-hidden"
                    onPointerDown={startDrainHold}
                    onPointerUp={endDrainHold}
                    onPointerLeave={cancelDrainHold}
                    onPointerCancel={cancelDrainHold}
                  >
                    <div
                      aria-hidden="true"
                      className="w-20 h-20"
                      style={{
                        backgroundColor: "currentColor",
                        WebkitMaskImage: `url(${SKULL_ICON_URL})`,
                        WebkitMaskSize: "contain",
                        WebkitMaskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskImage: `url(${SKULL_ICON_URL})`,
                        maskSize: "contain",
                        maskRepeat: "no-repeat",
                        maskPosition: "center",
                      }}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* Settings sheet */}
            <SettingsSheet
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              mtgMode={mtgMode}
              onToggleMtg={toggleMtgMode}
              allowNegative={allowNegative}
              onToggleNegative={() => setAllowNegative((v) => !v)}
              onRandomizeStartingPlayer={randomizeStartingPlayer}
              diceOpen={diceOpen}
              onToggleDice={() => setDiceOpen((v) => !v)}
              bloodbathEnabled={bloodbathEnabled}
              onToggleBloodbath={() => setBloodbathEnabled((v) => !v)}
            />

            {/* Dice roller popup */}
            <div className="absolute bottom-16 left-4">
              <DiceRoller open={diceOpen} onClose={() => setDiceOpen(false)} />
            </div>

            {/* Toolbar */}
            <div className="flex gap-2 px-4 py-3 flex-shrink-0 border-t border-border bg-background">
              <Button type="button" variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); onClose(); }}><X className="w-4 h-4" /></Button>
              <Button type="button" variant={settingsOpen ? "default" : "outline"} size="icon" onPointerDown={(e) => { e.stopPropagation(); setSettingsOpen((v) => !v); }}>
                <Settings2 className="w-4 h-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" onPointerDown={(e) => { e.stopPropagation(); randomizeStartingPlayer(); }}>
                <Flag className="w-4 h-4" />
              </Button>
              <Button type="button" className="flex-1 gap-2" onPointerDown={(e) => { e.stopPropagation(); handleFinish(); }}>
                <Trophy className="w-4 h-4" /> Log Score
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}