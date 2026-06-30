import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getRemotePrediction, saveRemotePrediction } from "@/services/progressService";

const PREDICTION_STORAGE_KEY = "wc26-prediction-v5";
const PREDICTION_UPDATED_KEY = "fan26.prediction-updated-at-v1";

const parseStored = (value: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const isPredictionPayload = (value: unknown) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const hasPredictionContent = (value: unknown) => {
  if (!isPredictionPayload(value)) return false;
  const record = value as Record<string, unknown>;
  const groups = record.groupOrder as Record<string, string[]> | undefined;
  const winners = record.winners as Record<string, string> | undefined;
  return Boolean(
    (groups && Object.values(groups).some((items) => items?.length)) ||
      (winners && Object.keys(winners).length),
  );
};

const localUpdatedAt = () => {
  const value = Number(localStorage.getItem(PREDICTION_UPDATED_KEY) ?? 0);
  return Number.isFinite(value) ? value : 0;
};

const UserDataSync = () => {
  const { user } = useAuth();
  const location = useLocation();
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      lastSynced.current = null;
      return;
    }

    let cancelled = false;
    const hydrate = async () => {
      try {
        const localRaw = localStorage.getItem(PREDICTION_STORAGE_KEY);
        const local = parseStored(localRaw);
        const remote = await getRemotePrediction(user.id);
        if (cancelled) return;

        const remotePayload = remote?.payload;
        const remoteUpdatedAt = Date.parse(remote?.updated_at ?? "") || 0;
        const shouldRestoreRemote =
          isPredictionPayload(remotePayload) &&
          (!isPredictionPayload(local) || remoteUpdatedAt > localUpdatedAt());

        if (shouldRestoreRemote) {
          const remoteRaw = JSON.stringify(remotePayload);
          localStorage.setItem(PREDICTION_STORAGE_KEY, remoteRaw);
          localStorage.setItem(PREDICTION_UPDATED_KEY, String(remoteUpdatedAt || Date.now()));
          lastSynced.current = remoteRaw;
          toast.success(
            hasPredictionContent(remotePayload)
              ? "Your latest saved prediction was restored."
              : "Your saved prediction reset was restored.",
          );
          if (location.pathname === "/prediction") window.location.reload();
          return;
        }

        if (isPredictionPayload(local)) {
          await saveRemotePrediction(user.id, local);
          if (cancelled) return;
          localStorage.setItem(PREDICTION_UPDATED_KEY, String(Date.now()));
          lastSynced.current = localRaw;
        }
      } catch (error) {
        console.error("Prediction sync failed", error);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, user]);

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => {
      const raw = localStorage.getItem(PREDICTION_STORAGE_KEY);
      if (!raw || raw === lastSynced.current) return;
      const parsed = parseStored(raw);
      if (!isPredictionPayload(parsed)) return;

      lastSynced.current = raw;
      void saveRemotePrediction(user.id, parsed)
        .then(() => {
          localStorage.setItem(PREDICTION_UPDATED_KEY, String(Date.now()));
        })
        .catch((error) => {
          console.error("Could not save prediction", error);
          lastSynced.current = null;
        });
    }, 1800);

    return () => window.clearInterval(interval);
  }, [user]);

  return null;
};

export default UserDataSync;
