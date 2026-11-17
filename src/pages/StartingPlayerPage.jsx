import { useState, useEffect, useRef, useCallback } from "react";

const HOLD_DURATION = 3000; // ms before picking

export default function StartingPlayerPage() {
  const [touches, setTouches] = useState({}); // id -> { x, y, startTime, progress }
  const [winner, setWinner] = useState(null); // { id, x, y }
  const [burst, setBurst] = useState(null);
  const animFrameRef = useRef(null);
  const touchesRef = useRef({});
  const winnerPickedRef = useRef(false);
  const containerRef = useRef(null);

  const pickWinner = useCallback(() => {
    if (winnerPickedRef.current) return;
    const ids = Object.keys(touchesRef.current);
    if (ids.length === 0) return;
    winnerPickedRef.current = true;
    const winId = ids[Math.floor(Math.random() * ids.length)];
    const t = touchesRef.current[winId];
    setWinner({ id: winId, x: t.x, y: t.y });
    setBurst({ x: t.x, y: t.y });
    // Auto-reset after 3s
    setTimeout(() => {
      setWinner(null);
      setBurst(null);
      setTouches({});
      touchesRef.current = {};
      winnerPickedRef.current = false;
    }, 3000);
  }, []);

  const tick = useCallback(() => {
    const now = Date.now();
    const updated = {};
    let anyReady = false;
    for (const [id, t] of Object.entries(touchesRef.current)) {
      const elapsed = now - t.startTime;
      const progress = Math.min(elapsed / HOLD_DURATION, 1);
      updated[id] = { ...t, progress };
      if (progress >= 1) anyReady = true;
    }
    touchesRef.current = updated;
    setTouches({ ...updated });
    if (anyReady) {
      pickWinner();
      return;
    }
    animFrameRef.current = requestAnimationFrame(tick);
  }, [pickWinner]);

  const startTick = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    if (winnerPickedRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const now = Date.now();
    const updated = { ...touchesRef.current };
    for (const t of e.changedTouches) {
      const x = t.clientX - (rect?.left || 0);
      const y = t.clientY - (rect?.top || 0);
      updated[t.identifier] = { x, y, startTime: now, progress: 0 };
    }
    touchesRef.current = updated;
    setTouches({ ...updated });
    startTick();
  }, [startTick]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    if (winnerPickedRef.current) return;
    const updated = { ...touchesRef.current };
    for (const t of e.changedTouches) {
      delete updated[t.identifier];
    }
    touchesRef.current = updated;
    setTouches({ ...updated });
    if (Object.keys(updated).length === 0) {
      cancelAnimationFrame(animFrameRef.current);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    if (winnerPickedRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const updated = { ...touchesRef.current };
    for (const t of e.changedTouches) {
      if (updated[t.identifier]) {
        updated[t.identifier] = {
          ...updated[t.identifier],
          x: t.clientX - (rect?.left || 0),
          y: t.clientY - (rect?.top || 0),
        };
      }
    }
    touchesRef.current = updated;
    setTouches({ ...updated });
  }, []);

  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const touchEntries = Object.entries(touches);
  const hasAnyTouch = touchEntries.length > 0;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-background select-none overflow-hidden"
      style={{ touchAction: "none" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {/* Instruction */}
      {!hasAnyTouch && !winner && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3">
          <p className="text-2xl font-display font-bold text-foreground/60">Everyone hold a finger down</p>
          <p className="text-sm text-muted-foreground">Hold for 3 seconds — one will be chosen</p>
        </div>
      )}

      {/* Touch circles */}
      {touchEntries.map(([id, t]) => {
        const isWinner = winner?.id === id;
        const size = 96;
        const stroke = 6;
        const r = (size - stroke) / 2;
        const circ = 2 * Math.PI * r;
        const offset = circ * (1 - t.progress);

        return (
          <div
            key={id}
            className="absolute pointer-events-none"
            style={{
              left: t.x - size / 2,
              top: t.y - size / 2,
              width: size,
              height: size,
            }}
          >
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
              {/* Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth={stroke}
              />
              {/* Progress arc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={isWinner ? "#facc15" : "hsl(var(--primary))"}
                strokeWidth={stroke}
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            </svg>
            {/* Center dot */}
            <div
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                className="rounded-full transition-all duration-200"
                style={{
                  width: isWinner ? 40 : 20,
                  height: isWinner ? 40 : 20,
                  background: isWinner ? "#facc15" : "hsl(var(--primary))",
                  boxShadow: isWinner ? "0 0 24px 8px rgba(250,204,21,0.7)" : "none",
                }}
              />
            </div>
          </div>
        );
      })}

      {/* Burst / winner overlay */}
      {burst && (
        <div
          className="absolute pointer-events-none"
          style={{ left: burst.x, top: burst.y, transform: "translate(-50%,-50%)" }}
        >
          {/* Rays */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                width: 4,
                height: 60,
                background: "linear-gradient(to top, #facc15, transparent)",
                borderRadius: 4,
                left: "50%",
                top: "50%",
                transformOrigin: "50% 0%",
                transform: `translateX(-50%) rotate(${i * 30}deg)`,
                animation: "burst-ray 0.6s ease-out forwards",
              }}
            />
          ))}
          <div
            className="absolute"
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "rgba(250,204,21,0.4)",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
              animation: "burst-glow 0.6s ease-out forwards",
            }}
          />
        </div>
      )}

      {/* Winner text */}
      {winner && (
        <div
          className="absolute pointer-events-none flex flex-col items-center gap-1"
          style={{
            left: winner.x,
            top: winner.y - 90,
            transform: "translateX(-50%)",
          }}
        >
          <span className="font-display font-bold text-yellow-400 text-lg drop-shadow-lg bg-black/50 px-3 py-1 rounded-full">
            ⭐ Starts First!
          </span>
        </div>
      )}

      <style>{`
        @keyframes burst-ray {
          0% { opacity: 1; height: 60px; }
          100% { opacity: 0; height: 100px; }
        }
        @keyframes burst-glow {
          0% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(3); }
        }
      `}</style>
    </div>
  );
}