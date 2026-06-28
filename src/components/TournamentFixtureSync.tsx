import { useMemo } from "react";
import { useAnnexC } from "@/hooks/useAnnexC";
import { useLiveScores } from "@/hooks/useLiveScores";
import {
  applyResolvedFixturesInPlace,
  buildTournamentState,
} from "@/utils/tournament";

/**
 * Keeps the shared fixture catalogue synchronized with the current group table.
 * It is rendered before the route tree, so match-detail and live-match components
 * see the same resolved Round-of-32 team names as the Fixtures page.
 */
const TournamentFixtureSync = () => {
  const { data, pairKey } = useLiveScores(60_000);
  const annex = useAnnexC();
  const tournament = useMemo(
    () => buildTournamentState(data, pairKey, annex.options),
    [data, pairKey, annex.options],
  );

  applyResolvedFixturesInPlace(tournament.fixtures);
  return null;
};

export default TournamentFixtureSync;
