import { Outlet, Link, useLocation } from "react-router-dom";
import ColorSchemeSwitcher from "@/components/ColorSchemeSwitcher";
import SaveStatus from "@/components/SaveStatus";
import { Dice5, History, Users, BarChart3 } from "lucide-react";

const navItems = [
  { path: "/", label: "Log Game", icon: Dice5 },
  { path: "/history", label: "History", icon: History },
  { path: "/players", label: "Players", icon: Users },
  { path: "/games", label: "Games", icon: BarChart3 },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Dice5 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">GameNight</span>
          </Link>
          <nav className="hidden items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <SaveStatus />
            <ColorSchemeSwitcher />
          </div>
        </div>
      </header>

      {/* Mobile nav — always visible on all screen sizes */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 pb-28 sm:pb-8">
        <Outlet />
      </main>
    </div>
  );
}