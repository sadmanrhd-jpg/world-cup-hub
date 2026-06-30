import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRoundCog,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import FootballPitch from "@/components/bestxi/FootballPitch";
import PlayerPickerSheet from "@/components/bestxi/PlayerPickerSheet";
import TeamFlag from "@/components/TeamFlag";
import { useAuth } from "@/contexts/AuthContext";
import { FORMATIONS, getFormation } from "@/data/formations";
import { getTeamByName } from "@/data/wc26";
import {
  deleteBestXi,
  fetchSavedBestXi,
  saveBestXi,
} from "@/services/bestXiService";
import {
  fetchWorldCupManagers,
  fetchWorldCupPlayers,
} from "@/services/playerService";
import type {
  BestXiStarter,
  SavedBestXi,
  WorldCupManager,
  WorldCupPlayer,
} from "@/types/fanProfile";

const DRAFT_KEY = "fan26.best-xi-draft-v1";

type Draft = {
  name: string;
  formation: string;
  starters: BestXiStarter[];
  substitutes: string[];
  managerId: string | null;
  editingId: string | null;
};

const emptyDraft: Draft = {
  name: "My Best XI",
  formation: "4-3-3",
  starters: [],
  substitutes: [],
  managerId: null,
  editingId: null,
};

const readDraft = (): Draft => {
  if (typeof window === "undefined") return emptyDraft;
  try {
    const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as Partial<Draft> | null;
    return parsed
      ? {
          name: parsed.name ?? emptyDraft.name,
          formation: parsed.formation ?? emptyDraft.formation,
          starters: parsed.starters ?? [],
          substitutes: parsed.substitutes ?? [],
          managerId: parsed.managerId ?? null,
          editingId: parsed.editingId ?? null,
        }
      : emptyDraft;
  } catch {
    return emptyDraft;
  }
};

const BestXiBuilder = () => {
  const { user } = useAuth();
  const [draft, setDraft] = useState<Draft>(readDraft);
  const [players, setPlayers] = useState<WorldCupPlayer[]>([]);
  const [managers, setManagers] = useState<WorldCupManager[]>([]);
  const [savedSquads, setSavedSquads] = useState<SavedBestXi[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [addingSubstitute, setAddingSubstitute] = useState(false);
  const [managerSearch, setManagerSearch] = useState("");
  const [managerPanelOpen, setManagerPanelOpen] = useState(false);

  const formation = getFormation(draft.formation);
  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const managersById = useMemo(
    () => new Map(managers.map((manager) => [manager.id, manager])),
    [managers],
  );
  const selectedIds = useMemo(
    () => new Set([...draft.starters.map((item) => item.playerId), ...draft.substitutes]),
    [draft.starters, draft.substitutes],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingData(true);
      try {
        const [nextPlayers, nextManagers] = await Promise.all([
          fetchWorldCupPlayers(),
          fetchWorldCupManagers(),
        ]);
        if (cancelled) return;
        setPlayers(nextPlayers);
        setManagers(nextManagers);
      } catch (error) {
        console.error(error);
        toast.error("Could not load World Cup squads.");
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    if (!user) {
      setSavedSquads([]);
      return;
    }
    void fetchSavedBestXi(user.id)
      .then(setSavedSquads)
      .catch((error) => console.error(error));
  }, [user]);

  const changeFormation = (nextFormation: string) => {
    const next = getFormation(nextFormation);
    const currentPlayers = draft.starters
      .map((starter) => playersById.get(starter.playerId))
      .filter(Boolean) as WorldCupPlayer[];
    const used = new Set<string>();
    const starters: BestXiStarter[] = [];

    next.slots.forEach((slot) => {
      const matching = currentPlayers.find(
        (player) => player.position === slot.position && !used.has(player.id),
      );
      if (matching) {
        used.add(matching.id);
        starters.push({ slotId: slot.id, playerId: matching.id });
      }
    });

    const movedToBench = currentPlayers
      .filter((player) => !used.has(player.id))
      .map((player) => player.id);
    const substitutes = Array.from(
      new Set([...draft.substitutes, ...movedToBench]),
    ).slice(0, 8);

    setDraft((current) => ({
      ...current,
      formation: nextFormation,
      starters,
      substitutes,
    }));
  };

  const chooseStarter = (player: WorldCupPlayer) => {
    if (!activeSlot) return;
    setDraft((current) => ({
      ...current,
      starters: [
        ...current.starters.filter(
          (item) => item.slotId !== activeSlot && item.playerId !== player.id,
        ),
        { slotId: activeSlot, playerId: player.id },
      ],
      substitutes: current.substitutes.filter((id) => id !== player.id),
    }));
    setActiveSlot(null);

    const currentIndex = formation.slots.findIndex((slot) => slot.id === activeSlot);
    const nextEmpty = formation.slots
      .slice(currentIndex + 1)
      .find((slot) => !draft.starters.some((item) => item.slotId === slot.id));
    if (nextEmpty) {
      window.setTimeout(() => setActiveSlot(nextEmpty.id), 180);
    }
  };

  const addSubstitute = (player: WorldCupPlayer) => {
    setDraft((current) => ({
      ...current,
      starters: current.starters.filter((item) => item.playerId !== player.id),
      substitutes: [...current.substitutes.filter((id) => id !== player.id), player.id].slice(0, 8),
    }));
    setAddingSubstitute(false);
  };

  const loadSquad = (squad: SavedBestXi) => {
    setDraft({
      name: squad.name,
      formation: squad.formation,
      starters: squad.payload.starters,
      substitutes: squad.payload.substitutes,
      managerId: squad.payload.managerId,
      editingId: squad.id,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.success(`${squad.name} loaded.`);
  };

  const newSquad = () => {
    setDraft({ ...emptyDraft, name: `My Best XI ${Math.min(savedSquads.length + 1, 5)}` });
  };

  const validate = () => {
    if (draft.starters.length !== 11) return "Select all 11 starters.";
    if (draft.substitutes.length !== 8) return "Select all 8 substitutes.";
    const substitutePlayers = draft.substitutes.map((id) => playersById.get(id));
    if (!substitutePlayers.some((player) => player?.position === "GK")) {
      return "The substitute bench must include at least one goalkeeper.";
    }
    if (!draft.managerId) return "Select a manager.";
    if (!draft.name.trim()) return "Give the squad a name.";
    if (!draft.editingId && savedSquads.length >= 5) {
      return "You can save a maximum of five Best XI teams.";
    }
    return null;
  };

  const save = async () => {
    if (!user) {
      toast.error("Log in to save this Best XI to your profile.");
      return;
    }
    const validation = validate();
    if (validation) {
      toast.error(validation);
      return;
    }

    setSaving(true);
    try {
      const saved = await saveBestXi({
        userId: user.id,
        id: draft.editingId,
        name: draft.name,
        formation: draft.formation,
        payload: {
          starters: draft.starters,
          substitutes: draft.substitutes,
          managerId: draft.managerId,
        },
      });
      setSavedSquads((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setDraft((current) => ({ ...current, editingId: saved.id }));
      toast.success("Best XI saved to your profile.");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not save the squad.");
    } finally {
      setSaving(false);
    }
  };

  const removeSaved = async (squad: SavedBestXi) => {
    if (!user || !window.confirm(`Delete ${squad.name}?`)) return;
    try {
      await deleteBestXi(user.id, squad.id);
      setSavedSquads((current) => current.filter((item) => item.id !== squad.id));
      if (draft.editingId === squad.id) newSquad();
    } catch (error: any) {
      toast.error(error?.message ?? "Could not delete the squad.");
    }
  };

  const selectedManager = draft.managerId ? managersById.get(draft.managerId) : null;
  const filteredManagers = managers.filter((manager) =>
    [manager.name, manager.teamName]
      .join(" ")
      .toLowerCase()
      .includes(managerSearch.trim().toLowerCase()),
  );
  const starterComplete = draft.starters.length;
  const benchGoalkeeper = draft.substitutes.some(
    (id) => playersById.get(id)?.position === "GK",
  );

  if (loadingData) {
    return (
      <div className="flex min-h-[420px] items-center justify-center gap-2 rounded-3xl border border-border card-elevated">
        <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading all World Cup squads
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border p-10 text-center">
        <UsersRound className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-3 text-2xl font-black">Squad database is empty</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          The automatic squad feed could not be reached. Reload the page after a moment. Your saved teams and draft remain safe.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Reload squads
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(350px,.85fr)]">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-primary">Starting XI</div>
              <h2 className="text-2xl font-black">{starterComplete}/11 selected</h2>
            </div>
            <select
              value={draft.formation}
              onChange={(event) => changeFormation(event.target.value)}
              className="rounded-full border border-border bg-input px-4 py-2.5 text-sm font-bold"
            >
              {FORMATIONS.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
          <FootballPitch
            formation={formation}
            starters={draft.starters}
            playersById={playersById}
            onSelectSlot={setActiveSlot}
            onRemove={(slotId) =>
              setDraft((current) => ({
                ...current,
                starters: current.starters.filter((item) => item.slotId !== slotId),
              }))
            }
          />
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl border border-border p-4 card-elevated sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-primary">Squad details</div>
                <h2 className="text-xl font-black">Name and save</h2>
              </div>
              <button
                type="button"
                onClick={newSquad}
                className="rounded-full border border-border px-3 py-2 text-xs font-bold hover:bg-secondary"
              >
                New team
              </button>
            </div>
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              maxLength={50}
              className="mt-4 w-full rounded-xl border border-border bg-input px-4 py-3 text-lg font-bold outline-none focus:border-primary"
              placeholder="Squad name"
            />
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-secondary/50 p-2.5">
                <div className="font-mono text-lg font-black">{starterComplete}/11</div>
                <div className="text-[9px] uppercase text-muted-foreground">Starters</div>
              </div>
              <div className="rounded-xl bg-secondary/50 p-2.5">
                <div className="font-mono text-lg font-black">{draft.substitutes.length}/8</div>
                <div className="text-[9px] uppercase text-muted-foreground">Subs</div>
              </div>
              <div className="rounded-xl bg-secondary/50 p-2.5">
                <div className="font-mono text-lg font-black">{selectedManager ? 1 : 0}/1</div>
                <div className="text-[9px] uppercase text-muted-foreground">Manager</div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border p-4 card-elevated sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
                  <UsersRound className="h-4 w-4" /> Substitutes
                </div>
                <h2 className="mt-1 text-xl font-black">8-player bench</h2>
              </div>
              <button
                type="button"
                disabled={draft.substitutes.length >= 8}
                onClick={() => setAddingSubstitute(true)}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className={`h-4 w-4 ${benchGoalkeeper ? "text-emerald-500" : "text-amber-500"}`} />
              {benchGoalkeeper ? "Goalkeeper requirement complete" : "At least one substitute must be a goalkeeper"}
            </div>
            <div className="mt-4 space-y-2">
              {draft.substitutes.map((id, index) => {
                const player = playersById.get(id);
                if (!player) return null;
                const team = getTeamByName(player.teamName);
                return (
                  <div key={id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                    <span className="w-5 text-center font-mono text-xs text-muted-foreground">{index + 1}</span>
                    <TeamFlag name={player.teamName} slug={team?.slug} className="h-9 w-9 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{player.name}</div>
                      <div className="text-[10px] text-muted-foreground">{player.position} · {player.teamName}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          substitutes: current.substitutes.filter((playerId) => playerId !== id),
                        }))
                      }
                      className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
              {draft.substitutes.length === 0 && (
                <button
                  type="button"
                  onClick={() => setAddingSubstitute(true)}
                  className="w-full rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground hover:border-primary"
                >
                  Add eight substitute players
                </button>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-border p-4 card-elevated sm:p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
              <UserRoundCog className="h-4 w-4" /> Manager
            </div>
            {selectedManager ? (
              <button
                type="button"
                onClick={() => setManagerPanelOpen(true)}
                className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-left"
              >
                <div className="grid h-11 w-11 place-items-center rounded-full bg-primary text-lg font-black text-primary-foreground">
                  {selectedManager.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-black">{selectedManager.name}</div>
                  <div className="text-xs text-muted-foreground">{selectedManager.teamName}</div>
                </div>
                <ChevronRight className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setManagerPanelOpen(true)}
                className="mt-3 w-full rounded-2xl border border-dashed border-border p-5 text-sm font-semibold text-muted-foreground hover:border-primary"
              >
                Select a World Cup manager
              </button>
            )}
          </section>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="sticky bottom-3 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-base font-black text-primary-foreground shadow-xl disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {user ? "Save Best XI" : "Log in to save"}
          </button>
        </div>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary">Your profile</div>
            <h2 className="text-2xl font-black">Saved Best XI teams</h2>
            <p className="mt-1 text-sm text-muted-foreground">Save up to five named squads.</p>
          </div>
          <span className="rounded-full border border-border px-3 py-1.5 text-xs font-bold">{savedSquads.length}/5 saved</span>
        </div>
        {user ? (
          savedSquads.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {savedSquads.map((squad) => (
                <div key={squad.id} className="rounded-2xl border border-border p-4 card-elevated">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black">{squad.name}</h3>
                      <div className="text-xs text-muted-foreground">{squad.formation} · 11 starters · 8 subs</div>
                    </div>
                    {draft.editingId === squad.id && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => loadSquad(squad)}
                      className="flex-1 rounded-full bg-secondary px-3 py-2 text-xs font-bold hover:bg-primary hover:text-primary-foreground"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeSaved(squad)}
                      className="grid h-9 w-9 place-items-center rounded-full border border-border text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Your saved squads will appear here.
            </div>
          )
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Log in from the Profile page to save and open squads on different devices.
          </div>
        )}
      </section>

      <PlayerPickerSheet
        open={Boolean(activeSlot)}
        title={`Choose ${formation.slots.find((slot) => slot.id === activeSlot)?.label ?? "player"}`}
        requiredPosition={formation.slots.find((slot) => slot.id === activeSlot)?.position ?? null}
        players={players}
        excludedIds={new Set(Array.from(selectedIds).filter((id) => draft.starters.find((item) => item.slotId === activeSlot)?.playerId !== id))}
        onSelect={chooseStarter}
        onClose={() => setActiveSlot(null)}
      />

      <PlayerPickerSheet
        open={addingSubstitute}
        title="Choose substitute"
        requiredPosition={null}
        players={players}
        excludedIds={selectedIds}
        onSelect={addSubstitute}
        onClose={() => setAddingSubstitute(false)}
      />

      {managerPanelOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center md:p-6">
          <button className="absolute inset-0" onClick={() => setManagerPanelOpen(false)} aria-label="Close manager picker" />
          <div className="relative flex h-[82vh] w-full max-w-2xl flex-col rounded-t-3xl border border-border bg-background md:rounded-3xl">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-primary">World Cup managers</div>
                <h2 className="text-xl font-black">Choose manager</h2>
              </div>
              <button onClick={() => setManagerPanelOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-border">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-b border-border p-4">
              <input
                value={managerSearch}
                onChange={(event) => setManagerSearch(event.target.value)}
                placeholder="Search manager or country"
                className="w-full rounded-full border border-border bg-input px-4 py-2.5 outline-none focus:border-primary"
              />
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {filteredManagers.map((manager) => (
                <button
                  key={manager.id}
                  type="button"
                  onClick={() => {
                    setDraft((current) => ({ ...current, managerId: manager.id }));
                    setManagerPanelOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left hover:border-primary/50 hover:bg-secondary/40"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary font-black">{manager.name.charAt(0)}</div>
                  <div>
                    <div className="font-bold">{manager.name}</div>
                    <div className="text-xs text-muted-foreground">{manager.teamName}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BestXiBuilder;
