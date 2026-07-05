import {
  type Fixture,
  fixtureKickoff,
  getTeamByName,
} from "@/data/wc26";
import {
  type LiveEvent,
  type LiveMap,
  teamKey,
} from "@/hooks/useLiveScores";

type PairKey = (home: string, away: string) => string;

const MATCH_TOLERANCE_MS = 90 * 60 * 1000;

const isKnownCountry = (name: string) => Boolean(getTeamByName(name));

const hasRealParticipants = (fixture: Fixture) =>
  isKnownCountry(fixture.home) && isKnownCountry(fixture.away);

const eventKickoff = (event: LiveEvent) => {
  if (!event.dateUTC) return null;
  const date = new Date(event.dateUTC);
  return Number.isNaN(date.getTime()) ? null : date;
};

const bstDateAndTime = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  type DatePart = "year" | "month" | "day" | "hour" | "minute";

  const value = (type: DatePart) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
};

const applyEvent = (fixture: Fixture, event: LiveEvent): Fixture => {
  const kickoff = eventKickoff(event);
  const schedule = kickoff
    ? bstDateAndTime(kickoff)
    : { date: fixture.date, time: fixture.time };

  const next: Fixture = {
    ...fixture,
    ...schedule,
    home: event.home,
    away: event.away,
  };

  if (isKnownCountry(next.home) && isKnownCountry(next.away)) {
    delete next.label;
  }

  return next;
};

export const resolveLiveFixtureParticipants = (
  fixtures: Fixture[],
  liveScores: LiveMap,
  pairKey: PairKey,
): Fixture[] => {
  const events = Array.from(liveScores.values());
  const claimedEventIds = new Set<string>();

  return [...fixtures]
    .sort((a, b) => fixtureKickoff(a).getTime() - fixtureKickoff(b).getTime())
    .map((fixture) => {
      const exact = liveScores.get(pairKey(fixture.home, fixture.away));

      if (exact) {
        claimedEventIds.add(exact.id);
        return applyEvent(fixture, exact);
      }

      if (hasRealParticipants(fixture)) return { ...fixture };

      const kickoffMs = fixtureKickoff(fixture).getTime();
      const candidate = events
        .filter((event) => {
          if (claimedEventIds.has(event.id)) return false;
          if (!isKnownCountry(event.home) || !isKnownCountry(event.away)) {
            return false;
          }

          const eventDate = eventKickoff(event);
          if (!eventDate) return false;

          return (
            Math.abs(eventDate.getTime() - kickoffMs) <=
            MATCH_TOLERANCE_MS
          );
        })
        .sort((a, b) => {
          const aTime = eventKickoff(a)?.getTime() ?? 0;
          const bTime = eventKickoff(b)?.getTime() ?? 0;
          return (
            Math.abs(aTime - kickoffMs) -
            Math.abs(bTime - kickoffMs)
          );
        })[0];

      if (!candidate) return { ...fixture };

      claimedEventIds.add(candidate.id);
      return applyEvent(fixture, candidate);
    })
    .sort((a, b) => a.id - b.id);
};

export const findLiveEventForFixture = (
  fixture: Fixture,
  liveScores: LiveMap,
  pairKey: PairKey,
) => {
  const exact = liveScores.get(pairKey(fixture.home, fixture.away));
  if (exact) return exact;

  // Never guess a different event for a fixture that already has two real
  // country names. Time-based matching is only a placeholder-resolution tool.
  if (hasRealParticipants(fixture)) return undefined;

  const kickoffMs = fixtureKickoff(fixture).getTime();

  return Array.from(liveScores.values())
    .filter((event) => {
      const date = eventKickoff(event);
      return (
        date != null &&
        Math.abs(date.getTime() - kickoffMs) <= MATCH_TOLERANCE_MS &&
        teamKey(event.home) !== teamKey(event.away)
      );
    })
    .sort((a, b) => {
      const aTime = eventKickoff(a)?.getTime() ?? 0;
      const bTime = eventKickoff(b)?.getTime() ?? 0;
      return (
        Math.abs(aTime - kickoffMs) -
        Math.abs(bTime - kickoffMs)
      );
    })[0];
};
