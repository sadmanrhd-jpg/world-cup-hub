import type { WorldCupPlayer } from "@/types/fanProfile";

const PlayerStatLine = ({ player }: { player: WorldCupPlayer }) => {
  const stats = player.stats;
  const items =
    player.position === "GK"
      ? [`${stats.saves} saves`, `${stats.cleanSheets} clean sheets`, `${stats.appearances} apps`]
      : player.position === "DEF"
        ? [`${stats.tackles} tackles`, `${stats.interceptions} interceptions`, `${stats.goals} goals`, `${stats.assists} assists`]
        : player.position === "MID"
          ? [`${stats.goals} goals`, `${stats.assists} assists`, `${stats.tackles} tackles`, `${stats.interceptions} interceptions`]
          : [`${stats.goals} goals`, `${stats.assists} assists`, `${stats.appearances} apps`];

  return (
    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
};

export default PlayerStatLine;
