/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useQuery,
  useInfiniteQuery,
  keepPreviousData,
  type UseQueryOptions,
  type UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import {
  listUsers,
  type UsersSearchParams,
  type UsersSearchResponse,
} from "@services/user.service";
import { useEffect, useRef, useState } from "react";

/* =========================
   Utils sin-warnings
   ========================= */

/** Serializa objetos con claves ordenadas para un key estable */
function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

/** Construye un queryKey estable y corto para React Query */
function makeUsersKey(scope: "list" | "infinite", params: UsersSearchParams) {
  // ojo: el primer nivel del key debe ser un array
  return ["users", scope, stableStringify(params)];
}

/** Debounce sin warnings ni deps innecesarias */
export function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay]);

  return debounced as T;
}

/* =========================
   useUsers (paginado)
   ========================= */
export function useUsers(
  params: UsersSearchParams,
  options?: UseQueryOptions<UsersSearchResponse, unknown, UsersSearchResponse>
) {
  // Merge DEFAULTS sin useMemo (no hace falta; el key será estable por stringify)
  const merged: UsersSearchParams = {
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortDir: "desc",
    ...params,
  };

  return useQuery({
    queryKey: makeUsersKey("list", merged),
    queryFn: () => listUsers(merged),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    ...options,
  });
}

/* =========================
   useInfiniteUsers (scroll)
   ========================= */
export function useInfiniteUsers(
  params: Omit<UsersSearchParams, "page">,
  options?: UseInfiniteQueryOptions<
    UsersSearchResponse,
    unknown,
    UsersSearchResponse
  >
) {
  const base: UsersSearchParams = {
    limit: 20,
    sortBy: "createdAt",
    sortDir: "desc",
    ...params,
  };

  const q:any = useInfiniteQuery({
    queryKey: makeUsersKey("infinite", base),
    queryFn: ({ pageParam }) => {
      const page = typeof pageParam === "number" ? pageParam : 1;
      return listUsers({ ...base, page });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const next = (lastPage.page ?? 1) + 1;
      return lastPage.totalPages && next <= lastPage.totalPages
        ? next
        : undefined;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    ...options,
  });

  
  const users = q.data?.pages.flatMap((p:any) => p.users ?? []) ?? [];
  return { ...q, users };
}
