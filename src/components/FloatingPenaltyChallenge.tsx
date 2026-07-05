import { Link } from "react-router-dom";

const FloatingPenaltyChallenge = () => (
  <Link
    to="/mini-game"
    aria-label="Play the Penalty Challenge"
    title="Play the Penalty Challenge"
    className="group fixed bottom-5 right-4 z-40 grid h-14 w-14 place-items-center rounded-full border border-primary/40 bg-background/90 shadow-2xl shadow-primary/25 backdrop-blur transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:bottom-7 sm:right-7 sm:h-16 sm:w-16"
  >
    <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 motion-reduce:animate-none" />

    <span className="relative grid h-12 w-12 place-items-center rounded-full bg-primary/15 sm:h-14 sm:w-14">
      <span
        aria-hidden="true"
        className="animate-[spin_5s_linear_infinite] text-2xl drop-shadow-md motion-reduce:animate-none sm:text-3xl"
      >
        ⚽
      </span>
    </span>

    <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-bold text-primary opacity-0 shadow-lg transition-opacity group-hover:opacity-100 sm:block">
      Penalty Challenge
    </span>
  </Link>
);

export default FloatingPenaltyChallenge;
