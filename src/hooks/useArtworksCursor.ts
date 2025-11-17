"use client";

import { useMemo } from "react";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
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
};

export function useArtworksCursor(filters: ArtworksCursorFilters = {}):any {
  const params = useMemo(
    () => ({
      q: filters.q || undefined,
      event: filters.event || undefined,
      pavilion: filters.pavilion || undefined,
      technique: filters.technique || undefined,
      limit: filters.limit ?? 24,
    }),
    [
      filters.q,
      filters.event,
      filters.pavilion,
      filters.technique,
      filters.limit,
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
  });

  const pages =
    (query.data as InfiniteData<CursorListResponse<ArtworkRow>> | undefined)
      ?.pages ?? [];

  const rows: ArtworkRow[] = pages.flatMap((p) => p.docs) ?? [];
  const totalFromApi = pages[0]?.pageInfo?.total as number | undefined;
  const totalLabel =
    typeof totalFromApi === "number"
      ? `${totalFromApi}`
      : pages.length > 0
      ? `${rows.length}${query.hasNextPage ? "+" : ""}`
      : query.isLoading
      ? "—"
      : `${rows.length}`;

  return { ...query, rows, totalLabel, loadMore: () => query.fetchNextPage() };
}
