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

// GET /events?status=active
export const listEvents = async (filters: ListEventsFilters = {}) => {
  const qs = buildQuery(filters);
  const url = `/event/events${qs ? `?${qs}` : ""}`;
  const { data } = await apiClient.get<EventDoc[]>(url, {
    withCredentials: true,
  });
  return data.map(normalizeId);
};

// GET /catalogs/events/:slug  (el controller busca por slug)
export const getEventBySlug = async (slug: string) => {
  const { data } = await apiClient.get<EventDoc>(
    `/event/events/${encodeURIComponent(slug)}`,
    {
      withCredentials: true,
    }
  );
  return normalizeId(data);
};

// POST /catalogs/events
export const createEvent = async (payload: CreateEventDto) => {
  const { data } = await apiClient.post<EventDoc>("/event/events", payload, {
    withCredentials: true,
  });
  return normalizeId(data);
};
