import { Plus, X } from "lucide-react";
import type {
  BestXiStarter,
  FormationDefinition,
  WorldCupPlayer,
} from "@/types/fanProfile";
import TeamFlag from "@/components/TeamFlag";
import { getTeamByName } from "@/data/wc26";

const FootballPitch = ({
  formation,
  starters,
  playersById,
  onSelectSlot,
  onRemove,
}: {
  formation: FormationDefinition;
  starters: BestXiStarter[];
  playersById: Map<string, WorldCupPlayer>;
  onSelectSlot: (slotId: string) => void;
  onRemove: (slotId: string) => void;
}) => {
  const playerFor = (slotId: string) => {
    const selected = starters.find((starter) => starter.slotId === slotId);
    return selected ? playersById.get(selected.playerId) : undefined;
  };

  return (
    <div className="relative aspect-[0.72] w-full overflow-hidden rounded-[28px] border border-white/15 bg-emerald-800 shadow-2xl">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.035)_50%,transparent_50%)] bg-[length:20%_100%]" />
      <div className="absolute inset-[4%] rounded-sm border-2 border-white/45" />
      <div className="absolute left-[18%] right-[18%] top-[4%] h-[16%] border-x-2 border-b-2 border-white/45" />
      <div className="absolute bottom-[4%] left-[18%] right-[18%] h-[16%] border-x-2 border-t-2 border-white/45" />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/45" />
      <div className="absolute left-[4%] right-[4%] top-1/2 h-0.5 -translate-y-1/2 bg-white/45" />

      {formation.slots.map((slot) => {
        const player = playerFor(slot.id);
        const team = player ? getTeamByName(player.teamName) : null;
        return (
          <div
            key={slot.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
          >
            {player ? (
              <div className="group relative w-[64px] text-center sm:w-[92px]">
                <button
                  type="button"
                  onClick={() => onSelectSlot(slot.id)}
                  className="mx-auto flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-background shadow-lg transition-transform hover:scale-105 sm:h-14 sm:w-14"
                >
                  <TeamFlag
                    name={player.teamName}
                    slug={team?.slug}
                    className="h-full w-full rounded-full"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(slot.id)}
                  className="absolute -right-0.5 -top-1 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white opacity-100 shadow sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Remove ${player.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSlot(slot.id)}
                  className="mt-1 w-full truncate rounded-md bg-black/70 px-1.5 py-1 text-[9px] font-bold text-white backdrop-blur sm:text-[10px]"
                  title={player.name}
                >
                  {player.name}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSelectSlot(slot.id)}
                className="flex h-11 w-11 flex-col items-center justify-center rounded-full border-2 border-dashed border-white/80 bg-black/20 text-white shadow-lg transition-transform hover:scale-105 hover:bg-black/35 sm:h-14 sm:w-14"
                aria-label={`Choose ${slot.label}`}
              >
                <Plus className="h-4 w-4" />
                <span className="text-[8px] font-black">{slot.label}</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FootballPitch;
