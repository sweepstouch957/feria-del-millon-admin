// hooks/useTechniques.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { listTechniques, type TechniqueDoc } from "@services/techniques.service";

export function useTechniques() {
  return useQuery<TechniqueDoc[]>({
    queryKey: ["techniques"],
    queryFn: listTechniques,
    staleTime: 5 * 60 * 1000,
  });
}
