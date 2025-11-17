// @hooks/queries/usePavilionBySlug.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { getPavillionBySlug, type PavilionDoc } from "@services/pavilions.service";

export function usePavilionBySlug(eventId: string, slug?: string) {
  return useQuery<PavilionDoc, Error>({
    queryKey: ["pavilion", eventId, slug],
    queryFn: () => getPavillionBySlug(eventId, String(slug)),
    enabled: Boolean(eventId && slug),
    staleTime: 10_000,
  });
}
