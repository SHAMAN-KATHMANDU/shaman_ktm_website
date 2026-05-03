export type ApiMode = "mock" | "live";

const raw = process.env.PROJECTX_API_MODE ?? process.env.NEXT_PUBLIC_PROJECTX_API_MODE;

// Default to "live" — the app now owns the backend at /api/public/v1.
// Set PROJECTX_API_MODE=mock to fall back to /data/mock seeds without a DB.
export const API_MODE: ApiMode = raw === "mock" ? "mock" : "live";

export const IS_LIVE = API_MODE === "live";
export const IS_MOCK = API_MODE === "mock";
