export const SCHEME_VARS = {
  royal: {
    "--background": "210 40% 96%",
    "--foreground": "215 30% 18%",
    "--card": "210 50% 99%",
    "--card-foreground": "215 30% 18%",
    "--primary": "215 65% 28%",
    "--primary-foreground": "45 80% 88%",
    "--secondary": "44 85% 52%",
    "--secondary-foreground": "215 30% 18%",
    "--muted": "210 30% 91%",
    "--muted-foreground": "215 18% 42%",
    "--accent": "44 85% 52%",
    "--accent-foreground": "215 30% 18%",
    "--border": "210 25% 84%",
    "--input": "210 25% 84%",
    "--ring": "215 65% 28%",
  },
  crimson: {
    "--background": "350 20% 97%",
    "--foreground": "355 30% 12%",
    "--card": "350 10% 100%",
    "--card-foreground": "355 30% 12%",
    "--primary": "355 65% 30%",
    "--primary-foreground": "0 0% 98%",
    "--secondary": "25 90% 58%",
    "--secondary-foreground": "355 30% 12%",
    "--muted": "350 15% 93%",
    "--muted-foreground": "355 10% 46%",
    "--accent": "25 90% 58%",
    "--accent-foreground": "355 30% 12%",
    "--border": "350 15% 88%",
    "--input": "350 15% 88%",
    "--ring": "355 65% 30%",
  },
  midnight: {
    "--background": "225 30% 8%",
    "--foreground": "220 20% 95%",
    "--card": "225 25% 12%",
    "--card-foreground": "220 20% 95%",
    "--primary": "220 70% 55%",
    "--primary-foreground": "0 0% 98%",
    "--secondary": "280 60% 60%",
    "--secondary-foreground": "0 0% 98%",
    "--muted": "225 20% 18%",
    "--muted-foreground": "220 10% 60%",
    "--accent": "280 60% 60%",
    "--accent-foreground": "0 0% 98%",
    "--border": "225 20% 20%",
    "--input": "225 20% 20%",
    "--ring": "220 70% 55%",
  },
  abyss: {
    "--background": "270 35% 6%",
    "--foreground": "270 15% 92%",
    "--card": "270 30% 10%",
    "--card-foreground": "270 15% 92%",
    "--primary": "270 70% 60%",
    "--primary-foreground": "0 0% 98%",
    "--secondary": "320 60% 55%",
    "--secondary-foreground": "0 0% 98%",
    "--muted": "270 25% 15%",
    "--muted-foreground": "270 10% 58%",
    "--accent": "320 60% 55%",
    "--accent-foreground": "0 0% 98%",
    "--border": "270 25% 18%",
    "--input": "270 25% 18%",
    "--ring": "270 70% 60%",
  },
  forest: {
    "--background": "130 25% 14%",
    "--foreground": "60 20% 92%",
    "--card": "130 20% 18%",
    "--card-foreground": "60 20% 92%",
    "--primary": "85 45% 38%",
    "--primary-foreground": "60 20% 95%",
    "--secondary": "30 40% 35%",
    "--secondary-foreground": "60 20% 92%",
    "--muted": "130 18% 24%",
    "--muted-foreground": "100 12% 58%",
    "--accent": "30 40% 35%",
    "--accent-foreground": "60 20% 92%",
    "--border": "130 18% 26%",
    "--input": "130 18% 26%",
    "--ring": "85 45% 38%",
  },
  ancient: {
    "--background": "25 30% 12%",
    "--foreground": "30 25% 80%",
    "--card": "25 28% 17%",
    "--card-foreground": "30 25% 80%",
    "--primary": "28 55% 45%",
    "--primary-foreground": "30 30% 92%",
    "--secondary": "18 40% 30%",
    "--secondary-foreground": "30 25% 80%",
    "--muted": "25 22% 22%",
    "--muted-foreground": "28 18% 55%",
    "--accent": "35 50% 38%",
    "--accent-foreground": "30 25% 80%",
    "--border": "25 20% 28%",
    "--input": "25 20% 28%",
    "--ring": "28 55% 45%",
  },
};

export const SCHEMES = [
  { id: "royal",    label: "Royal",    primary: "215 65% 28%" },
  { id: "crimson",  label: "Crimson",  primary: "355 65% 30%" },
  { id: "midnight", label: "Midnight", primary: "220 70% 55%" },
  { id: "abyss",    label: "Abyss",    primary: "270 70% 60%" },
  { id: "forest",   label: "Forest",   primary: "85 45% 38%"  },
  { id: "ancient",  label: "Ancient",  primary: "28 55% 45%"  },
  { id: "chaos",    label: "Chaos",    primary: "0 0% 50%"    },
];

export function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function randomHsl(hRange, sRange, lRange) {
  const r = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  return `${r(...hRange)} ${r(...sRange)}% ${r(...lRange)}%`;
}

function generateChaosVars() {
  const bg = randomHsl([0, 360], [10, 40], [8, 20]);
  const fg = randomHsl([0, 360], [10, 20], [80, 95]);
  const card = randomHsl([0, 360], [10, 35], [12, 22]);
  const primary = randomHsl([0, 360], [55, 85], [45, 65]);
  const secondary = randomHsl([0, 360], [55, 80], [45, 65]);
  const muted = randomHsl([0, 360], [10, 25], [18, 28]);
  const mutedFg = randomHsl([0, 360], [8, 18], [50, 65]);
  const border = randomHsl([0, 360], [10, 25], [20, 30]);
  return {
    "--background": bg,
    "--foreground": fg,
    "--card": card,
    "--card-foreground": fg,
    "--primary": primary,
    "--primary-foreground": "0 0% 98%",
    "--secondary": secondary,
    "--secondary-foreground": "0 0% 98%",
    "--muted": muted,
    "--muted-foreground": mutedFg,
    "--accent": secondary,
    "--accent-foreground": "0 0% 98%",
    "--border": border,
    "--input": border,
    "--ring": primary,
  };
}

export function applyScheme(id) {
  const vars = id === "chaos" ? generateChaosVars() : SCHEME_VARS[id];
  if (!vars) return;
  Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  const bg = vars["--background"];
  const [h, s, l] = bg.split(" ").map((v) => parseFloat(v));
  const themeColor = hslToHex(h, s, l);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
}

// Apply immediately on import (before DB loads) using localStorage
const storedScheme = localStorage.getItem("colorScheme") || "royal";
applyScheme(storedScheme);