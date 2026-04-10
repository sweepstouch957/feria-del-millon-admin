// src/hooks/queries/usePavilionsByUser.ts
"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listPavilionsByUser,
  type ListPavilionsByUserResponse,
} from "@services/pavilions.service"; // ⬅️ ajusta si lo agregaste en events.service

type Options = {
  /** ms que el dato se considera fresco (default 60s). */
  staleTime?: number;
  /** ms de garbage-collection en caché (default 5 min). */
  gcTime?: number;
  /** Evita refetch al volver a la ventana (default false). */
  refetchOnWindowFocus?: boolean;
  /** Reintentos ante errores transitorios (default 2, ignora 404). */
  retryCount?: number;
};

export function usePavilionsByUser(
  eventId?: string,
  userId?: string,
  includeCounts: boolean = true,
  {
    staleTime = 60_000,
    gcTime = 5 * 60_000,
    refetchOnWindowFocus = false,
    retryCount = 2,
  }: Options = {}
) {
  const enabled = Boolean(eventId) && Boolean(userId);

  // Memo para la queryKey (evitar objetos inestables)
  const key = useMemo(
    () => ["events", eventId ?? null, "pavilions", "by-user", userId ?? null, includeCounts],
    [eventId, userId, includeCounts]
  );

  return useQuery<ListPavilionsByUserResponse>({
    queryKey: key,
    enabled,
    staleTime,
    gcTime,
    refetchOnWindowFocus,
    retry: (failureCount, err: any) => {
      const statusCode = err?.response?.status ?? err?.status;
      if (statusCode === 404) return false; // no reintentar si no hay datos
      return failureCount < retryCount;
    },
    queryFn: async () => {
      // eventId/userId garantizados por `enabled`
      return listPavilionsByUser(eventId as string, userId as string, includeCounts);
    },
    select: (data) => {
      // Ordena por nombre si viene disponible; si no, por slug
      const sortedRows = [...(data?.rows ?? [])].sort((a, b) => {
        const an = (a.name || a.slug || "").toLowerCase();
        const bn = (b.name || b.slug || "").toLowerCase();
        return an.localeCompare(bn);
      });

      // Derivados útiles para UI
      const totalArtworks = sortedRows.reduce(
        (acc, r) => acc + (r.artworksCount || 0),
        0
      );

      return {
        ...data,
        rows: sortedRows,
        meta: {
          totalArtworks,
        },
      };
    },
  });
}
