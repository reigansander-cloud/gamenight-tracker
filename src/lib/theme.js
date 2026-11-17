// One colour scheme: Gilded — Abyss's near-black layout with gold where Abyss had purple / pink.
export const SCHEME_VARS = {
  gilded: {
    "--background": "40 30% 5%",
    "--foreground": "45 25% 92%",
    "--card": "40 26% 9%",
    "--card-foreground": "45 25% 92%",
    "--popover": "40 26% 9%",
    "--popover-foreground": "45 25% 92%",
    "--primary": "43 78% 52%",
    "--primary-foreground": "40 45% 8%",
    "--secondary": "32 80% 50%",
    "--secondary-foreground": "40 45% 8%",
    "--muted": "40 22% 14%",
    "--muted-foreground": "42 12% 60%",
    "--accent": "36 85% 56%",
    "--accent-foreground": "40 45% 8%",
    "--border": "40 24% 18%",
    "--input": "40 24% 18%",
    "--ring": "43 78% 52%",
  },
};

export const SCHEMES = [
  { id: "gilded", label: "Gilded", primary: "43 78% 52%" },
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
  // (older saved choices like "abyss" or "royal" all show as Gilded now)
  const vars = SCHEME_VARS.gilded;
  Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  const bg = vars["--background"];
  const [h, s, l] = bg.split(" ").map((v) => parseFloat(v));
  const themeColor = hslToHex(h, s, l);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
}

// Apply immediately on import
applyScheme("gilded");