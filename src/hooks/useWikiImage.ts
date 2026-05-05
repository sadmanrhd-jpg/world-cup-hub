import { useQuery } from "@tanstack/react-query";

type WikiSummary = {
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string };
  description?: string;
  extract?: string;
};

export const useWikiImage = (title?: string) => {
  return useQuery({
    queryKey: ["wiki", title],
    enabled: !!title,
    staleTime: 1000 * 60 * 60 * 24,
    queryFn: async (): Promise<WikiSummary | null> => {
      if (!title) return null;
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
      if (!res.ok) return null;
      return (await res.json()) as WikiSummary;
    },
  });
};
