// One colour scheme: Abyss.
export const SCHEME_VARS = {
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
};

export const SCHEMES = [
  { id: "abyss", label: "Abyss", primary: "270 70% 60%" },
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

export function applyScheme(id) {
  // (any older saved choice shows as Abyss now)
  const vars = SCHEME_VARS.abyss;
  Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  const bg = vars["--background"];
  const [h, s, l] = bg.split(" ").map((v) => parseFloat(v));
  const themeColor = hslToHex(h, s, l);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
}

// Apply immediately on import (before DB loads) using localStorage
applyScheme("abyss");