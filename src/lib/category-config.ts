export const CATEGORY_CONFIG: Record<string, { color: string; emoji: string }> = {
  "Ausstellung & Kunst":    { color: "#8b5cf6", emoji: "" },
  "Feste & Feiern":         { color: "#f97316", emoji: "🎉" },
  "Gesellschaft & Vereine": { color: "#3b82f6", emoji: "" },
  "Kinder & Familie":       { color: "#10b981", emoji: "" },
  "Musik":                  { color: "#6366f1", emoji: "" },
  "Märkte & Flohmärkte":    { color: "#f59e0b", emoji: "" },
  "Party & Nightlife":      { color: "#ec4899", emoji: "" },
  "Sport & Bewegung":       { color: "#22c55e", emoji: "" },
  "Theater & Comedy":       { color: "#a855f7", emoji: "" },
  "Vortrag & Führung":      { color: "#64748b", emoji: "" },
};

export const DEFAULT_PIN_COLOR = "#ef4444";

export function getCategoryConfig(name: string | null): { color: string; emoji: string } {
  if (name && CATEGORY_CONFIG[name]) return CATEGORY_CONFIG[name];
  return { color: DEFAULT_PIN_COLOR, emoji: "" };
}
