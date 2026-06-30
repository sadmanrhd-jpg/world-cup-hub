import { Crown } from "lucide-react";
import BestXiBuilder from "@/components/bestxi/BestXiBuilder";

const BestXI = () => (
  <div className="container py-10 md:py-12">
    <div className="mb-8 max-w-3xl">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary">
        <Crown className="h-4 w-4" /> World Cup 2026
      </div>
      <h1 className="mt-2 text-4xl font-black md:text-5xl">Build Your Best XI</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
        Pick players from all 48 squads, choose eight substitutes and appoint a manager. Player options show World Cup-only statistics.
      </p>
    </div>
    <BestXiBuilder />
  </div>
);

export default BestXI;
