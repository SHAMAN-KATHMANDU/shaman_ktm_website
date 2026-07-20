// Curated editorial accent palette for the homepage sections. Editors pick one
// per section in /sysuser/homepage; the section applies it as the CSS variable
// `--accent` (highlight colour for eyebrows, numbers, badges, rules) and, for
// the solid-colour trust band, as the band background.

export const HOME_ACCENTS = ["gold", "green", "clay", "cream", "ink"] as const;
export type HomeAccent = (typeof HOME_ACCENTS)[number];

export const DEFAULT_ACCENT: HomeAccent = "gold";

/** Highlight colour — legible on both the dark and cream section backgrounds. */
export const ACCENT_COLOR: Record<HomeAccent, string> = {
  gold: "#c4a35a",
  green: "#6a8352",
  clay: "#b5613f",
  cream: "#f5edd8",
  ink: "#1f180a",
};

/** Readable text colour to sit ON a solid accent-coloured background. */
export const ACCENT_ON: Record<HomeAccent, string> = {
  gold: "#0a0806",
  green: "#f5edd8",
  clay: "#f5edd8",
  cream: "#1f180a",
  ink: "#f5edd8",
};

export const ACCENT_LABEL: Record<HomeAccent, string> = {
  gold: "Gold",
  green: "Green",
  clay: "Clay",
  cream: "Cream",
  ink: "Ink",
};

export function accentColor(a: HomeAccent | undefined | null): string {
  return ACCENT_COLOR[a ?? DEFAULT_ACCENT] ?? ACCENT_COLOR[DEFAULT_ACCENT];
}

export function accentOn(a: HomeAccent | undefined | null): string {
  return ACCENT_ON[a ?? DEFAULT_ACCENT] ?? ACCENT_ON[DEFAULT_ACCENT];
}

/** Which homepage sections carry a configurable accent. */
export const ACCENT_SECTIONS = [
  "offers",
  "campaign",
  "clearance",
  "trust",
  "who",
  "memberCircle",
] as const;
export type AccentSection = (typeof ACCENT_SECTIONS)[number];

export type SectionAccents = Partial<Record<AccentSection, HomeAccent>>;
