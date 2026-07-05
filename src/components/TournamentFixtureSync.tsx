import { useMemo } from "react";
import { useAnnexC } from "@/hooks/useAnnexC";
import { useLiveScores } from "@/hooks/useLiveScores";
import {
  applyResolvedFixturesInPlace,
  buildTournamentState,
} from "@/utils/tournament";
import { resolveLiveFixtureParticipants } from "@/utils/liveFixtureParticipants";

/**
 * Keeps the shared fixture catalogue synchronized with group standings,
 * live scores and the official upcoming-match participant list.
 */
const TournamentFixtureSync = () => {
  const { data, pairKey } = useLiveScores();
  const annex = useAnnexC();

  const tournament = useMemo(
    () => buildTournamentState(data, pairKey, annex.options),
    [data, pairKey, annex.options],
  );

  const synchronizedFixtures = useMemo(
    () =>
      resolveLiveFixtureParticipants(
        tournament.fixtures,
        data,
        pairKey,
      ),
    [tournament.fixtures, data, pairKey],
  );

  applyResolvedFixturesInPlace(synchronizedFixtures);
  return null;
};

export default TournamentFixtureSync;
