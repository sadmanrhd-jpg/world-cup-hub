import type { PlayerPosition } from "@/types/fanProfile";

const POSITION_LABELS: Record<PlayerPosition, string> = {
  GK: "GK",
  DEF: "DF",
  MID: "MF",
  FWD: "FW",
};

export const formatPlayerPosition = (
  position: PlayerPosition | string | null | undefined,
) => {
  const normalized = String(position ?? "")
    .trim()
    .toUpperCase()
    .replace(/^\d+/, "");

  if (normalized in POSITION_LABELS) {
    return POSITION_LABELS[normalized as PlayerPosition];
  }

  if (normalized === "DF" || normalized.includes("DEF")) return "DF";
  if (normalized === "MF" || normalized.includes("MID")) return "MF";
  if (
    normalized === "FW" ||
    normalized === "ST" ||
    normalized.includes("FORW")
  ) {
    return "FW";
  }
  if (normalized.includes("GOAL")) return "GK";

  return normalized || "—";
};
