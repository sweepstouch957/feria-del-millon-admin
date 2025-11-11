"use client";

import { useQuery } from "@tanstack/react-query";
import { listPavilions, type PavilionDoc } from "@services/pavilions.service";

export function usePavilions(eventId?: string) {
  return useQuery<PavilionDoc[]>({
    queryKey: ["pavilions", eventId],
    queryFn: () => (eventId ? listPavilions(eventId) : Promise.resolve([])),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  });
}