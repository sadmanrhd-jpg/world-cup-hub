import { useEffect, useState } from "react";
import { teamKey } from "@/hooks/useLiveScores";

export type PenaltyShootoutResult = {
  home: string;
  away: string;
  homePenalties: number | null;
  awayPenalties: number | null;
  winner: string | null;
};

export type PenaltyShootoutMap = Map<string, PenaltyShootoutResult>;

export const shootoutPairKey = (home: string, away: string) =>
  [teamKey(home), teamKey(away)].sort().join("|");

type RawTeam = {
  displayName?: string;
  shortDisplayName?: string;
  name?: string;
};

type RawCompetitor = {
  homeAway?: "home" | "away";
  score?: string | number;
  winner?: boolean;
  team?: RawTeam;
  shootoutScore?: unknown;
  penaltyShootoutScore?: unknown;
  penaltyScore?: unknown;
  penalties?: unknown;
  shootout?: unknown;
};

type RawStatus = {
  displayClock?: string;
  type?: {
    state?: string;
    completed?: boolean;
    description?: string;
    detail?: string;
    shortDetail?: string;
    name?: string;
  };
};

type RawNote = {
  headline?: string;
  text?: string;
  description?: string;
};

type RawCompetition = {
  competitors?: RawCompetitor[];
  status?: RawStatus;
  notes?: RawNote[];
  shootout?: unknown;
  penaltyShootout?: unknown;
};

type RawEvent = {
  id?: string;
  status?: RawStatus;
  competitions?: RawCompetition[];
  notes?: RawNote[];
};

type RawPayload = { events?: RawEvent[] };

const teamName = (competitor?: RawCompetitor) =>
  competitor?.team?.displayName ??
  competitor?.team?.shortDisplayName ??
  competitor?.team?.name ??
  "";

const numberFrom = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    return match ? Number(match[0]) : null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["score", "value", "displayValue", "total"]) {
      const parsed = numberFrom(record[key]);
      if (parsed != null) return parsed;
    }
  }
  return null;
};

const directPenaltyScore = (competitor?: RawCompetitor) => {
  if (!competitor) return null;
  for (const value of [
    competitor.shootoutScore,
    competitor.penaltyShootoutScore,
    competitor.penaltyScore,
    competitor.penalties,
    competitor.shootout,
  ]) {
    const parsed = numberFrom(value);
    if (parsed != null) return parsed;
  }
  return null;
};

const statusStrings = (event: RawEvent, competition?: RawCompetition) => {
  const statuses = [event.status, competition?.status];
  const values: string[] = [];

  for (const status of statuses) {
    for (const value of [
      status?.type?.description,
      status?.type?.detail,
      status?.type?.shortDetail,
      status?.type?.name,
    ]) {
      if (value) values.push(value);
    }
  }

  for (const note of [...(event.notes ?? []), ...(competition?.notes ?? [])]) {
    for (const value of [note.headline, note.text, note.description]) {
      if (value) values.push(value);
    }
  }

  return values;
};

const pairFromPenaltyText = (texts: string[]) => {
  const penaltyTexts = texts.filter((text) =>
    /penalt|shootout|shoot-out|\bpk\b|\bpens?\b/i.test(text),
  );

  for (const text of penaltyTexts) {
    const pairs = Array.from(
      text.matchAll(/(\d{1,2})\s*[-–:]\s*(\d{1,2})/g),
    );
    const pair = pairs[pairs.length - 1];
    if (pair) return [Number(pair[1]), Number(pair[2])] as const;
  }

  return null;
};

const parseEvent = (event: RawEvent): PenaltyShootoutResult | null => {
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find(
    (competitor) => competitor.homeAway === "home",
  );
  const away = competition?.competitors?.find(
    (competitor) => competitor.homeAway === "away",
  );
  const homeName = teamName(home);
  const awayName = teamName(away);

  if (!homeName || !awayName) return null;

  let homePenalties = directPenaltyScore(home);
  let awayPenalties = directPenaltyScore(away);
  const texts = statusStrings(event, competition);
  const penaltyText = texts.some((text) =>
    /penalt|shootout|shoot-out|\bpk\b|\bpens?\b/i.test(text),
  );
  const structuralPenalty = Boolean(
    competition?.shootout || competition?.penaltyShootout,
  );

  if (homePenalties == null || awayPenalties == null) {
    const textPair = pairFromPenaltyText(texts);
    if (textPair) {
      const [first, second] = textPair;
      if (home?.winner === true && first < second) {
        homePenalties = second;
        awayPenalties = first;
      } else if (away?.winner === true && first > second) {
        homePenalties = second;
        awayPenalties = first;
      } else {
        homePenalties = first;
        awayPenalties = second;
      }
    }
  }

  const hasPenaltyScores = homePenalties != null && awayPenalties != null;
  if (!hasPenaltyScores && !penaltyText && !structuralPenalty) return null;

  const winner =
    home?.winner === true
      ? homeName
      : away?.winner === true
        ? awayName
        : hasPenaltyScores && homePenalties !== awayPenalties
          ? homePenalties! > awayPenalties!
            ? homeName
            : awayName
          : null;

  return {
    home: homeName,
    away: awayName,
    homePenalties,
    awayPenalties,
    winner,
  };
};

export const shootoutLabel = (result: PenaltyShootoutResult) => {
  const score =
    result.homePenalties != null && result.awayPenalties != null
      ? `${result.homePenalties}-${result.awayPenalties}`
      : null;

  if (result.winner && score) return `${result.winner} won ${score} on penalties`;
  if (score) return `Penalties ${score}`;
  if (result.winner) return `${result.winner} won on penalties`;
  return "Decided on penalties";
};

export const usePenaltyShootouts = (refreshMs = 60_000) => {
  const [data, setData] = useState<PenaltyShootoutMap>(new Map());

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;

    const load = async () => {
      if (document.visibilityState === "hidden") return;
      controller?.abort();
      controller = new AbortController();

      try {
        const response = await fetch("/api/live-scores", {
          signal: controller.signal,
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;

        const payload = (await response.json()) as RawPayload;
        const next: PenaltyShootoutMap = new Map();
        for (const event of payload.events ?? []) {
          const result = parseEvent(event);
          if (result) {
            next.set(shootoutPairKey(result.home, result.away), result);
          }
        }

        if (!cancelled) setData(next);
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          console.warn("Could not read penalty shootout results", error);
        }
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };

    void load();
    const timer = window.setInterval(() => void load(), refreshMs);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshMs]);

  return data;
};
