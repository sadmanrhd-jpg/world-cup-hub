import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import PredictionDesktop from "./PredictionDesktop";
import PredictionMobile from "./PredictionMobile";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAnnexC } from "@/hooks/useAnnexC";
import { useLiveScores } from "@/hooks/useLiveScores";
import { usePenaltyShootouts } from "@/hooks/usePenaltyShootouts";
import { buildTournamentState } from "@/utils/tournament";
import {
  buildOfficialPredictionUpdate,
  synchronizePredictionStorage,
} from "@/utils/predictionAutoFill";

const Prediction = () => {
  const isMobile = useIsMobile();
  const {
    data: liveScores,
    loading: liveScoresLoading,
    pairKey,
  } = useLiveScores();
  const shootouts = usePenaltyShootouts(30_000);
  const annex = useAnnexC();

  const tournament = useMemo(
    () => buildTournamentState(liveScores, pairKey, annex.options),
    [liveScores, pairKey, annex.options],
  );

  const officialUpdate = useMemo(
    () =>
      buildOfficialPredictionUpdate(
        tournament,
        liveScores,
        shootouts,
        pairKey,
      ),
    [tournament, liveScores, shootouts, pairKey],
  );

  const [appliedSignature, setAppliedSignature] = useState<string | null>(
    null,
  );
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const changed = synchronizePredictionStorage(officialUpdate);

    setAppliedSignature(officialUpdate.signature);
    if (changed) {
      setRevision((current) => current + 1);
    }
  }, [
    officialUpdate,
    liveScores,
    shootouts,
  ]);

  if (
    liveScoresLoading ||
    appliedSignature !== officialUpdate.signature
  ) {
    return (
      <div className="container grid min-h-[55vh] place-items-center py-12">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Updating completed matches and the live bracket…
        </div>
      </div>
    );
  }

  const renderKey = `${officialUpdate.signature}-${revision}-${
    isMobile ? "mobile" : "desktop"
  }`;

  return isMobile ? (
    <PredictionMobile key={renderKey} />
  ) : (
    <PredictionDesktop key={renderKey} />
  );
};

export default Prediction;
