import { useEffect, useState } from "react";

export type AnnexCOptions = Record<string, string[]>;

type AnnexCState = {
  options: AnnexCOptions;
  loading: boolean;
  error: string | null;
  exactCount: number;
};

// Exact fallbacks for the combinations still relevant at the end of the
// current group stage. The API supplies all 495 official Annex C options.
const FALLBACK_OPTIONS: AnnexCOptions = {
  BDEFIJKL: ["E", "J", "B", "D", "I", "F", "L", "K"],
  BDEFGIKL: ["E", "G", "B", "D", "I", "F", "L", "K"],
  BDEFGIJL: ["E", "G", "B", "D", "J", "F", "L", "I"],
  BDEFGIJK: ["E", "G", "B", "D", "J", "F", "I", "K"],
  ABDEFGIL: ["E", "G", "B", "D", "A", "F", "L", "I"],
  ABDEFGIK: ["E", "G", "B", "D", "A", "F", "I", "K"],
  ABDEFGIJ: ["E", "G", "B", "D", "A", "F", "I", "J"],
  ABCDEFGI: ["C", "G", "B", "D", "A", "F", "E", "I"],
};

let cachedOptions: AnnexCOptions | null = null;
let sharedRequest: Promise<AnnexCOptions> | null = null;

const requestOptions = async () => {
  if (cachedOptions) return cachedOptions;
  if (!sharedRequest) {
    sharedRequest = fetch("/api/annex-c", { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Annex C returned ${response.status}`);
        const payload = (await response.json()) as { options?: AnnexCOptions };
        if (!payload.options || Object.keys(payload.options).length < 490) {
          throw new Error("The complete Annex C matrix was not returned");
        }
        cachedOptions = payload.options;
        return payload.options;
      })
      .finally(() => {
        sharedRequest = null;
      });
  }
  return sharedRequest;
};

export const useAnnexC = (): AnnexCState => {
  const [state, setState] = useState<AnnexCState>(() => ({
    options: { ...FALLBACK_OPTIONS, ...(cachedOptions ?? {}) },
    loading: cachedOptions == null,
    error: null,
    exactCount: cachedOptions ? Object.keys(cachedOptions).length : Object.keys(FALLBACK_OPTIONS).length,
  }));

  useEffect(() => {
    let active = true;

    requestOptions()
      .then((options) => {
        if (!active) return;
        setState({
          options: { ...FALLBACK_OPTIONS, ...options },
          loading: false,
          error: null,
          exactCount: Object.keys(options).length,
        });
      })
      .catch((error) => {
        if (!active) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : "Annex C could not be loaded",
        }));
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
};
