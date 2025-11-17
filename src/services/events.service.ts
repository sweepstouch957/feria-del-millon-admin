/* eslint-disable @typescript-eslint/no-explicit-any */

import apiClient from "@/axios";


/* ========= Tipos ========= */
export type EventStatus = "draft" | "active" | "finalizado" | "archived";

export interface EventStats {
  pavilionCount?: number;
  artistCount?: number;
  artworkCount?: number;
}

export interface EventDoc {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  validFrom: string; // ISO
  validTo: string; // ISO
  status: EventStatus;
  description?: string;
  termsUrl?: string;
  websiteUrl?: string;
  currency?: string; // default "COP"
  inventoryCloseAt?: string; // ISO
  minArtworkPrice?: number;
  maxArtworkPrice?: number;
  artistIds?: string[];
  cashierIds?: string[];
  stats?: EventStats;
  meta?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEventDto {
  name: string;
  slug: string;
  validFrom: string; // ISO
  validTo: string; // ISO
  status?: EventStatus;
  description?: string;
  termsUrl?: string;
  websiteUrl?: string;
  currency?: string;
  inventoryCloseAt?: string;
  minArtworkPrice?: number;
  maxArtworkPrice?: number;
  artistIds?: string[];
  cashierIds?: string[];
  meta?: Record<string, any>;
}

export interface ListEventsFilters {
  status?: EventStatus;
}

/* ========= Helpers ========= */
const normalizeId = <T extends { id?: string; _id?: string }>(obj: T) => ({
  ...obj,
  id: (obj as any).id || (obj as any)._id,
});

const buildQuery = (params: Record<string, any> = {}) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

/* ========= Endpoints ========= */

// GET /event/events?status=active
export const listEvents = async (filters: ListEventsFilters = {}) => {
  const qs = buildQuery(filters);
  const url = `/event/events${qs ? `?${qs}` : ""}`;
  const { data } = await apiClient.get<EventDoc[]>(url, {
    withCredentials: true,
  });
  return data.map(normalizeId);
};

// GET /event/events/:slug  (controller busca por slug)
export const getEventBySlug = async (slug: string) => {
  const { data } = await apiClient.get<EventDoc>(
    `/event/events/${encodeURIComponent(slug)}`,
    {
      withCredentials: true,
    }
  );
  return normalizeId(data);
};

// GET /event/events/artist/:artistId  🔥 NUEVO ENDPOINT
export const getEventByArtistId = async (
  artistId: string,
  status?: EventStatus
) => {
  const qs = buildQuery({ status });
  const url = `/event/events/artist/${encodeURIComponent(artistId)}${qs ? `?${qs}` : ""
    }`;
  const { data } = await apiClient.get<EventDoc>(url, {
    withCredentials: true,
  });
  return normalizeId(data);
};

// POST /event/events
export const createEvent = async (payload: CreateEventDto) => {
  const { data } = await apiClient.post<EventDoc>("/event/events", payload, {
    withCredentials: true,
  });
  return normalizeId(data);
};

export type ArtistSort = "artworks" | "name";

export interface PavilionArtworkStat {
  pavilionId: string;
  name?: string;
  slug?: string;
  artworksCount: number;
}

export interface ArtistSummary {
  id: string;
  name: string;
  email?: string;
  isArtista: boolean;
}

export interface ArtistWithStats {
  artist: ArtistSummary;
  stats: {
    totalArtworks: number;
    byPavilion: PavilionArtworkStat[];
  };
}

export interface ListEventArtistsQuery {
  q?: string;
  pavilionId?: string;
  artistId?: string;
  sort?: ArtistSort;  // default: 'artworks'
  page?: number;      // default: 1
  limit?: number;     // default: 20 (máx 100)
}

export interface ListEventArtistsResponse {
  ok: boolean;
  page: number;
  limit: number;
  total: number;
  rows: ArtistWithStats[];
}

/* ========= Helper local ========= */
const normalizeArtistRow = (row: ArtistWithStats): ArtistWithStats => ({
  ...row,
  artist: {
    ...row.artist,
    id: (row.artist as any).id ?? (row.artist as any)._id, // por si viniera _id
  },
});

/* ========= Endpoint: GET /event/events/:eventId/artists ========= */
export const listEventArtists = async (
  eventId: string,
  params: ListEventArtistsQuery = {}
): Promise<ListEventArtistsResponse> => {
  const qs = buildQuery(params);
  const url = `/event/events/${encodeURIComponent(eventId)}/artists${qs ? `?${qs}` : ""}`;

  const { data } = await apiClient.get<ListEventArtistsResponse>(url, {
    withCredentials: true,
  });

  return {
    ...data,
    rows: (data.rows ?? []).map(normalizeArtistRow),
  };
};

// ✅ Actualizar evento (PATCH /event/events/:eventId)
export const updateEvent = async (
  eventId: string,
  payload: Partial<CreateEventDto & { status?: EventStatus }>
) => {
  const { data } = await apiClient.patch<EventDoc>(
    `/event/events/${encodeURIComponent(eventId)}`,
    payload,
    { withCredentials: true }
  );
  return normalizeId(data);
};
