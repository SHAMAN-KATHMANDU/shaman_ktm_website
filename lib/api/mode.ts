export type ApiMode = "mock" | "live";

const raw = process.env.PROJECTX_API_MODE ?? process.env.NEXT_PUBLIC_PROJECTX_API_MODE;

export const API_MODE: ApiMode = raw === "live" ? "live" : "mock";

export const IS_LIVE = API_MODE === "live";
export const IS_MOCK = API_MODE === "mock";
