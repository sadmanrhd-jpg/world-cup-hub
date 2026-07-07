import type { FantasyPosition, FantasyRoundCode } from "@/types/fantasy";

export const FANTASY_SQUAD_LIMITS: Record<FantasyPosition, number> = {
  GK: 2,
  DEF: 5,
  MID: 5,
  FW: 3,
};

export const FANTASY_ROUND_BUDGETS: Record<FantasyRoundCode, number> = {
  QF: 105,
  SF: 125,
  FINAL: 135,
};

export const FANTASY_FORMATIONS = [
  "3-4-3",
  "3-5-2",
  "4-3-3",
  "4-4-2",
  "4-5-1",
  "5-3-2",
  "5-4-1",
] as const;

export const FANTASY_SCORING = [
  { event: "Plays 1–59 minutes", GK: 1, DEF: 1, MID: 1, FW: 1 },
  { event: "Plays 60+ minutes", GK: 2, DEF: 2, MID: 2, FW: 2 },
  { event: "Goal", GK: 5, DEF: 5, MID: 5, FW: 5 },
  { event: "Assist", GK: 3, DEF: 3, MID: 3, FW: 3 },
  { event: "Clean sheet after 60+ minutes", GK: 4, DEF: 4, MID: 1, FW: 0 },
  { event: "Every 3 saves", GK: 2, DEF: null, MID: null, FW: null },
  { event: "Penalty saved during match", GK: 5, DEF: null, MID: null, FW: null },
  { event: "Penalty missed during match", GK: -2, DEF: -2, MID: -2, FW: -2 },
  { event: "Every 2 goals conceded while playing", GK: -2, DEF: -1, MID: 0, FW: 0 },
  { event: "Yellow card", GK: -1, DEF: -1, MID: -1, FW: -1 },
  { event: "Red card", GK: -3, DEF: -3, MID: -3, FW: -3 },
  { event: "Own goal", GK: -2, DEF: -2, MID: -2, FW: -2 },
] as const;

export const FANTASY_SHOOTOUT_SCORING = [
  { event: "Goalkeeper saves a shootout penalty", points: 1 },
  { event: "Shooter misses a shootout penalty", points: -1 },
  { event: "Shooter scores a shootout penalty", points: 0 },
] as const;

export const FANTASY_FAQ = [
  {
    question: "Do I need an account?",
    answer: "Yes. You must sign in with a normal account to create and save a Fantasy Game team. Guest accounts cannot enter the prize leaderboard.",
  },
  {
    question: "How many fantasy teams can I create?",
    answer: "One team per account for each round. You can rebuild that team freely until the round locks.",
  },
  {
    question: "How many players do I need?",
    answer: "Your squad must contain 15 players: 2 goalkeepers, 5 defenders, 5 midfielders and 3 forwards.",
  },
  {
    question: "Is there a limit on players from one country?",
    answer: "No. There is no minimum or maximum country limit in any round.",
  },
  {
    question: "When does my team lock?",
    answer: "The entire squad, bench order and captain lock at halftime of the first match in that round. After that, no further changes are allowed for the round.",
  },
  {
    question: "Can I add a player after they already scored?",
    answer: "You may add the player before the round locks, but you will not receive points for goals, assists, saves, cards or other events that happened before the player was selected.",
  },
  {
    question: "How are appearance minutes counted after a late selection?",
    answer: "Appearance points use the player’s full real match minutes. Event points before the selection time do not count.",
  },
  {
    question: "How do clean sheets work after a late selection?",
    answer: "Clean sheets and goals conceded use the player’s full real participation. Selecting a defender later does not erase a goal their team already conceded.",
  },
  {
    question: "Are transfers free?",
    answer: "Yes. Changes are unlimited and there is no point penalty before the round deadline.",
  },
  {
    question: "What happens if my captain does not play?",
    answer: "No captain bonus is awarded. Captaincy does not automatically move to another player.",
  },
  {
    question: "Does the third-place match count?",
    answer: "Yes. The third-place match and the Final both count in the Final round.",
  },
  {
    question: "Can I join after the competition starts?",
    answer: "Yes, until halftime of the first match of a round. A late entrant earns zero points for that already-started round and begins scoring from the next round.",
  },
  {
    question: "Where does player data come from?",
    answer: "Player, squad and match-performance data are collected from ESPN’s soccer data endpoints and cached by the application.",
  },
  {
    question: "When are points final?",
    answer: "Points remain provisional until the match or round is reviewed. Verified corrections may be applied before totals are finalized.",
  },
];
