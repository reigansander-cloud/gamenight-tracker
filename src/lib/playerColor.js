// Player colors are normally a hex string. "gold" is the one special value:
// it renders as a metallic gradient rather than a flat fill.
export const GOLD = "gold";

const GOLD_GRADIENT =
  "linear-gradient(135deg, #d4af37 0%, #fff2a1 35%, #b8860b 70%, #8b6508 100%)";

export const isGold = (color) => color === GOLD;

// Solid gold surfaces: color swatch, player dot, live score card fill
export const goldFillStyle = { backgroundImage: GOLD_GRADIENT };

// Metallic ring with a warm glow, for the round player badge
export const goldRingStyle = {
  border: "2px solid transparent",
  background: `linear-gradient(hsl(var(--muted)), hsl(var(--muted))) padding-box, ${GOLD_GRADIENT} border-box`,
  boxShadow: "0 0 12px rgba(212, 175, 55, 0.4)",
};

// Column tint for score tables — handles hex colors and gold alike
export const playerTint = (color, alpha) => {
  if (!color) return null;
  if (isGold(color)) return `rgba(212, 175, 55, ${alpha})`;
  const h = color.replace("#", "");
  if (h.length < 6) return null;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  if ([r, g, b].some(isNaN)) return null;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};