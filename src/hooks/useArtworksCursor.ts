"use client";

import { useCallback, useMemo } from "react";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import {
  listArtworks,
  type CursorListResponse,
  type ArtworkDoc,
} from "@services/artworks.service";

type ArtistInfo = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};
type TechniqueInfo = { _id: string; name: string; slug?: string };
type PavilionInfo = { _id: string; name: string; slug?: string };

export type ArtworkRow = ArtworkDoc & {
  artistInfo?: ArtistInfo | null;
  techniqueInfo?: TechniqueInfo | null;
  pavilionInfo?: PavilionInfo | null;
};

export type ArtworksCursorFilters = {
  q?: string;
  event?: string;
  pavilion?: string | "null";
  technique?: string;
  limit?: number;
  artist?: string;
  includeHidden?: boolean | number | string;
  visibility?: "visible" | "hidden";
  /** Campos extra a proyectar (p. ej. "tagId"). */
  project?: string;
  /** false = no consulta (p. ej. pestaña que no muestra obras). */
  enabled?: boolean;
  /** Deja la lista anterior mientras llega la nueva (buscador sin parpadeo). */
  keepPrevious?: boolean;
};

export function useArtworksCursor(filters: ArtworksCursorFilters = {}) {
  const params = useMemo(
    () => ({
      q: filters.q || undefined,
      event: filters.event || undefined,
      pavilion: filters.pavilion || undefined,
      technique: filters.technique || undefined,
      limit: filters.limit ?? 24,
      artist: filters.artist || undefined,
      includeHidden: filters.includeHidden || undefined,
      visibility: filters.visibility || undefined,
      project: filters.project || undefined,
    }),
    [
      filters.q,
      filters.event,
      filters.pavilion,
      filters.technique,
      filters.limit,
      filters.artist,
      filters.includeHidden,
      filters.visibility,
      filters.project,
    ]
  );

  const query = useInfiniteQuery<
    CursorListResponse<ArtworkRow>,
    Error,
    CursorListResponse<ArtworkRow>,
    readonly ["artworks", typeof params],
    string | undefined
  >({
    queryKey: ["artworks", params] as const,
    queryFn: ({ pageParam }) => listArtworks({ ...params, cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined,
    staleTime: 10_000,
    enabled: filters.enabled ?? true,
    placeholderData: filters.keepPrevious ? keepPreviousData : undefined,
  });

  const pages = useMemo(
    () => ((query.data as any)?.pages ?? []) as any[],
    [query.data]
  );

  // Memoizado a propósito: sin esto `rows` es un arreglo nuevo en cada
  // render, y cualquier efecto que lo tenga como dependencia entra en bucle.
  // (Pasaba en /inventory/artworks/qr: regeneraba los QR sin parar y dejaba
  // el hilo principal saturado.)
  const rows: ArtworkRow[] = useMemo(
    () => pages.flatMap((p: any) => p.docs) ?? [],
    [pages]
  );
  const totalFromApi = pages[0]?.pageInfo?.total as number | undefined;
  const totalLabel =
    typeof totalFromApi === "number"
      ? `${totalFromApi}`
      : pages.length > 0
      ? `${rows.length}${query.hasNextPage ? "+" : ""}`
      : query.isLoading
      ? "—"
      : `${rows.length}`;

  const { fetchNextPage } = query;
  const loadMore = useCallback(() => fetchNextPage(), [fetchNextPage]);
  return { ...query, rows, totalLabel, loadMore };
}
