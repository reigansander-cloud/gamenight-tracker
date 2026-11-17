import { useState } from "react";
import { Menu, Timer, Settings2, Wrench, ChevronRight, Dices, Sliders, Hash, Shuffle, Users } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import QuickLiveScore from "@/components/QuickLiveScore";

const TOOLS = [
  { path: "/tools/starting-player", label: "Starting Player", icon: Users },
  { path: "/tools/resources", label: "Resource Tracker", icon: Sliders },
  { path: "/tools/codenames", label: "Code Names", icon: Hash },
  { path: "/tools/dice", label: "Dice Roller", icon: Dices },
  { path: "/tools/timer", label: "Turn Timer", icon: Timer },
  { path: "/tools/randomizer", label: "Randomizer", icon: Shuffle },
];

export default function ColorSchemeSwitcher() {
  const [navOpen, setNavOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [quickLiveOpen, setQuickLiveOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const close = () => { setNavOpen(false); setToolsOpen(false); };

  return (
    <div className="flex items-center gap-2">
      {/* Settings link */}
      <Link
        to="/templates"
        className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border text-sm font-medium hover:bg-muted transition-colors shadow-sm ${
          location.pathname === "/templates" ? "text-primary border-primary/40" : "text-foreground"
        }`}
      >
        <Settings2 className="w-4 h-4" />
        <span className="hidden sm:inline">Settings</span>
      </Link>

      {/* Tools dropdown */}
      <div className="relative">
        <button
          onClick={() => setNavOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
        >
          <Wrench className="w-4 h-4" />
          <span className="hidden sm:inline">Tools</span>
        </button>

        {navOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={close} />
            <div className="absolute top-full right-0 mt-2 z-50 bg-card border border-border rounded-xl shadow-lg p-2 flex flex-col gap-0.5 min-w-[180px]">
              {/* Quick Score */}
              <button
                onClick={() => { close(); setQuickLiveOpen(true); }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors w-full text-left"
              >
                <Timer className="w-4 h-4" />
                Quick Score
              </button>

              {TOOLS.map((t) => (
                <Link
                  key={t.path}
                  to={t.path}
                  onClick={(e) => {
                    close();
                    if (location.pathname === t.path) {
                      e.preventDefault();
                      navigate(t.path, { state: { reopen: Date.now() } });
                    }
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === t.path ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <QuickLiveScore
        open={quickLiveOpen}
        onClose={() => setQuickLiveOpen(false)}
        onLogGame={({ gameName, players }) => {
          navigate("/", { state: { prefill: { gameName, players } } });
        }}
      />
    </div>
  );
}