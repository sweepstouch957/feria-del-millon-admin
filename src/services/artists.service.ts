/* eslint-disable @typescript-eslint/no-explicit-any */
// services/artists.service.ts
import apiClient from "@/axios";

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;          // "-createdAt" | "name" | etc.
}

export interface PaginatedResponse<T> {
  docs: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Artist {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
  disciplines?: string[];     // ["Dibujo", "Fotografía", ...]
  social?: { instagram?: string; web?: string };
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateArtistDto {
  firstName: string;
  lastName: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
  disciplines?: string[];
  social?: { instagram?: string; web?: string };
  isActive?: boolean;
}

export type UpdateArtistDto = Partial<CreateArtistDto>

export interface ArtistFilters extends PaginationParams {
  q?: string;               // texto libre
  discipline?: string;      // "Dibujo" | "Fotografía" | ...
  active?: boolean;
}

const normalizeId = <T extends { id?: string; _id?: string }>(obj: T) => ({
  ...obj,
  id: (obj as any).id || (obj as any)._id,
});

const buildQuery = (params: Record<string, any> = {}) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

// ─────────── Endpoints ───────────
export const getArtists = async (filters: ArtistFilters = {}) => {
  const qs = buildQuery(filters);
  const url = `/artists${qs ? `?${qs}` : ""}`;
  const { data } = await apiClient.get<PaginatedResponse<Artist>>(url, { withCredentials: true });
  return {
    ...data,
    docs: data.docs.map(normalizeId),
  };
};

export const getArtistById = async (idOrSlug: string) => {
  const { data } = await apiClient.get<Artist>(`/artists/${idOrSlug}`, { withCredentials: true });
  return normalizeId(data);
};

export const createArtist = async (payload: CreateArtistDto) => {
  const { data } = await apiClient.post<Artist>("/artists", payload, { withCredentials: true });
  return normalizeId(data);
};

export const updateArtist = async (id: string, payload: UpdateArtistDto) => {
  const { data } = await apiClient.put<Artist>(`/artists/${id}`, payload, { withCredentials: true });
  return normalizeId(data);
};

export const deleteArtist = async (id: string) => {
  await apiClient.delete(`/artists/${id}`, { withCredentials: true });
  return true;
};

// Activar/Desactivar
export const toggleArtistActive = async (id: string, isActive: boolean) => {
  const { data } = await apiClient.patch<Artist>(
    `/artists/${id}/active`,
    { isActive },
    { withCredentials: true }
  );
  return normalizeId(data);
};

// Métricas simple (conteos por disciplina, total activos, etc.)
export interface ArtistStats {
  total: number;
  active: number;
  byDiscipline: Record<string, number>;
}

export const getArtistStats = async () => {
  const { data } = await apiClient.get<ArtistStats>("/artists/stats", { withCredentials: true });
  return data;
};
