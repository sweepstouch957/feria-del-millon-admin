/* eslint-disable @typescript-eslint/no-explicit-any */

import apiClient from "@/axios";
export interface ArtistInfo {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles?: Record<string, any>;
}

/* ========= Tipos ========= */
export interface PavilionDoc {
  id: string;
  _id?: string;
  event: string;
  name: string;
  slug: string;
  description?: string;
  validFrom?: string;
  validTo?: string;
  minArtworkPrice?: number;
  maxArtworkPrice?: number;
  mainImage?: string;
  order?: number;
  active?: boolean;
  meta?: Record<string, any>;
  artists?: string[]; 
  artistInfo?: ArtistInfo[]; // 👈 NUEVO
  createdAt?: string;
  updatedAt?: string;
}


export interface CreatePavilionDto {
  name: string;
  slug: string;
  description?: string;
  validFrom?: string; // ISO
  validTo?: string; // ISO
  minArtworkPrice?: number;
  maxArtworkPrice?: number;
  mainImage?: string;
  order?: number;
  active?: boolean;
  meta?: Record<string, any>;
  artists?: string[];
}

/* ========= Helpers ========= */
const normalizeId = <T extends { id?: string; _id?: string }>(obj: T) => ({
  ...obj,
  id: (obj as any).id || (obj as any)._id,
});

/* ========= Endpoints ========= */

// POST /events/:eventId/pavilions
export const createPavilion = async (
  eventId: string,
  payload: CreatePavilionDto
) => {
  const { data } = await apiClient.post<PavilionDoc>(
    `/event/events/${encodeURIComponent(eventId)}/pavilions`,
    payload,
    { withCredentials: true }
  );
  return normalizeId(data);
};

// GET /events/:eventId/pavilions
export const listPavilions = async (eventId: string) => {
  const { data } = await apiClient.get<PavilionDoc[]>(
    `/event/events/${encodeURIComponent(eventId)}/pavilions`,
    { withCredentials: true }
  );
  return data.map(normalizeId);
};

// GET /events/:eventId/pavilions/:slug
export const getPavillionBySlug = async (eventId: string, slug: string) => {
  const { data } = await apiClient.get<PavilionDoc>(
    `/event/events/${encodeURIComponent(
      eventId
    )}/pavilions/${encodeURIComponent(slug)}`,
    { withCredentials: true }
  );
  return normalizeId(data);
};

/* ========= Tipos: Pabellones por Usuario ========= */
export interface PavilionByUserRow {
  pavilionId: string;
  name?: string;
  slug?: string;
  mainImage?: string;
  priceRange?: { min?: number; max?: number };
  artworksCount?: number; // presente si includeCounts=true
}

export interface ListPavilionsByUserResponse {
  ok: boolean;
  total: number;
  rows: PavilionByUserRow[];
}

/* ========= Endpoint: GET /events/:eventId/pavilions/by-user/:userId ========= */
export const listPavilionsByUser = async (
  eventId: string,
  userId: string,
  includeCounts: boolean = true
): Promise<ListPavilionsByUserResponse> => {
  const qs = includeCounts === false ? "?includeCounts=false" : "";
  const url = `/event/events/${encodeURIComponent(
    eventId
  )}/pavilions/by-user/${encodeURIComponent(userId)}${qs}`;

  const { data } = await apiClient.get<ListPavilionsByUserResponse>(url, {
    withCredentials: true,
  });

  // No hay _id en filas; retornamos tal cual
  return data;
};

// ✅ Actualizar pabellón (PATCH /event/events/:eventId/pavilions/:pavilionId)
export const updatePavilion = async (
  eventId: string,
  pavilionId: string,
  payload: Partial<CreatePavilionDto>
) => {
  const { data } = await apiClient.patch<PavilionDoc>(
    `/event/events/${encodeURIComponent(
      eventId
    )}/pavilions/${encodeURIComponent(pavilionId)}`,
    payload,
    { withCredentials: true }
  );
  return normalizeId(data);
};

/* ========= Actualizar artistas de un pabellón por email ========= */

export interface UpdatePavilionArtistsPayload {
  emails?: string[]; // o
  artistEmails?: string[]; // el backend ya soporta ambos
  mode?: "replace" | "merge"; // replace (default) | merge
}

// POST /events/:eventId/pavilions/:pavilionId/artists
export const updatePavilionArtists = async (
  eventId: string,
  pavilionId: string,
  payload: UpdatePavilionArtistsPayload
) => {
  const { data } = await apiClient.post(
    `/event/events/${encodeURIComponent(
      eventId
    )}/pavilions/${encodeURIComponent(pavilionId)}/artists`,
    payload,
    { withCredentials: true }
  );
  return data;
};
