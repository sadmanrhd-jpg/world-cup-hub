import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";

const FloatingStatsButton = () => (
  <Link
    to="/stats"
    aria-label="Open tournament stats"
    title="Open tournament stats"
    className="group fixed bottom-[5.25rem] right-4 z-40 grid h-14 w-14 place-items-center rounded-full border border-primary/40 bg-background/90 shadow-2xl shadow-primary/20 backdrop-blur transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:hidden"
  >
    <span className="absolute inset-0 rounded-full bg-primary/10" />
    <span className="relative flex h-12 w-12 flex-col items-center justify-center rounded-full bg-primary/15 text-primary">
      <BarChart3 className="h-5 w-5" />
      <span className="mt-0.5 text-[9px] font-black leading-none">Stat</span>
    </span>
  </Link>
);

export default FloatingStatsButton;
