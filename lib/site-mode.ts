export type SiteMode = "live" | "coming-soon";

export const SITE_MODE: SiteMode =
  (process.env.NEXT_PUBLIC_SITE_MODE ?? "live") as SiteMode;

export const IS_COMING_SOON = SITE_MODE === "coming-soon";
