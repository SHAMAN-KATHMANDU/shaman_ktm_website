// Curated editorial accent palette for the homepage sections (Stone Temple
// Trinity v3.0). Editors pick one per section in /sysuser/homepage; the
// section applies it as the CSS variable `--accent` (band backgrounds, rules,
// badges) and, for text sitting on bone/cream, via ACCENT_TEXT.
//
// Every ACCENT_COLOR is a text-bearing fill: bone text passes AA on gold,
// green, clay and ink; ink text passes on cream. Pure decorative gold
// (#A98E52) never appears here — text-bearing gold is metal-deep.

export const HOME_ACCENTS = ["gold", "green", "clay", "cream", "ink"] as const;
export type HomeAccent = (typeof HOME_ACCENTS)[number];

export const DEFAULT_ACCENT: HomeAccent = "gold";

/** Solid accent fill (band backgrounds, big numbers on bands). */
export const ACCENT_COLOR: Record<HomeAccent, string> = {
  gold: "#7e6939", // metal-deep — AA 5.0 with bone text
  green: "#4d6759", // accent-deep jade
  clay: "#9c4136", // rakta
  cream: "#f4f2e9",
  ink: "#24302b",
};

/** Readable text colour to sit ON a solid accent-coloured background. */
export const ACCENT_ON: Record<HomeAccent, string> = {
  gold: "#faf9f3",
  green: "#faf9f3",
  clay: "#faf9f3",
  cream: "#24302b",
  ink: "#faf9f3",
};

/** AA text shade of the accent for use ON bone/cream grounds
 *  (eyebrows, stat numbers, rules). Cream has no legible text reading
 *  on a light ground, so it falls back to soft ink. */
export const ACCENT_TEXT: Record<HomeAccent, string> = {
  gold: "#7a6638", // metal-text
  green: "#4d6759",
  clay: "#9c4136",
  cream: "#575e59", // ink-soft
  ink: "#24302b",
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

export function accentText(a: HomeAccent | undefined | null): string {
  return ACCENT_TEXT[a ?? DEFAULT_ACCENT] ?? ACCENT_TEXT[DEFAULT_ACCENT];
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
