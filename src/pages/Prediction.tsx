import PredictionDesktop from "./PredictionDesktop";
import PredictionMobile from "./PredictionMobile";
import { useIsMobile } from "@/hooks/useIsMobile";

const Prediction = () => {
  const isMobile = useIsMobile();
  return isMobile ? <PredictionMobile /> : <PredictionDesktop />;
};

export default Prediction;
