
"use client";

import { useQuery } from "@tanstack/react-query";
import { getArtworkById } from "@services/artworks.service";
import type {
  ArtworkDetailResponse,
} from "@services/artworks.service";

export function useArtworkDetail(id?: string):any {
  return useQuery<ArtworkDetailResponse, Error>({
    queryKey: ["artwork-detail", id],
    // El detalle abre también las archivadas, para poder restaurarlas.
    queryFn: () => getArtworkById(id as string, true),
    enabled: Boolean(id), // evita llamadas si no hay id
    staleTime: 2 * 60 * 1000, // 2 minutos
    retry: false, // evita spam si hay error de id inválido
  });
}
