
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

// Actualizar evento (PATCH /event/events/:eventId)
/* ========= Crear evento (POST /event/events, staff) ========= */
export const createEvent = async (payload: CreateEventDto) => {
  const { data } = await apiClient.post<EventDoc>("/event/events", payload, {
    withCredentials: true,
  });
  return normalizeId(data);
};

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

// Interruptor global del catálogo (PATCH /event/events/:eventId/catalog-reveal, staff)
// revealed=true muestra las obras marcadas "oculta hasta el evento" sin esperar validFrom.
export const setCatalogReveal = async (eventId: string, revealed: boolean) => {
  const { data } = await apiClient.patch<{ ok: boolean; catalogRevealed: boolean }>(
    `/event/events/${encodeURIComponent(eventId)}/catalog-reveal`,
    { revealed },
    { withCredentials: true }
  );
  return data;
};

/* ========= Convocatorias ========= */
export type ConvocatoriaStatus =
  | "draft"
  | "open"
  | "closed"
  | "selection"
  | "finalized"
  | "archived";

export interface Convocatoria {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  event: string;
  startDate: string;
  endDate: string;
  fee: number;
  currency: string;
  status: ConvocatoriaStatus;
  description?: string;
  maxArtworksPerArtist?: number;
  allowedTechniqueIds?: string[];
  requirements?: ConvocatoriaRequirements;
  termsUrl?: string;
  websiteUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Requisitos configurables por convocatoria (cambian cada año).
export interface ConvocatoriaRequirements {
  maxImages?: number;
  priceMin?: number;
  priceMax?: number;
  documents?: { cv?: boolean; profilePhoto?: boolean; bio?: boolean; projectReview?: boolean; montage?: boolean; detail?: boolean };
}

// GET /event/convocatorias
export const getConvocatorias = async (): Promise<Convocatoria[]> => {
  const { data } = await apiClient.get<Convocatoria[]>("/event/convocatorias", {
    withCredentials: true,
  });
  return (data || []).map(normalizeId);
};

// PATCH /event/convocatorias/:id  (staff)
export const updateConvocatoria = async (
  id: string,
  payload: Partial<
    Pick<
      Convocatoria,
      "name" | "description" | "startDate" | "endDate" | "fee" | "currency" | "status" | "maxArtworksPerArtist" | "allowedTechniqueIds" | "requirements" | "termsUrl" | "websiteUrl"
    >
  >
): Promise<Convocatoria> => {
  const { data } = await apiClient.patch<Convocatoria>(
    `/event/convocatorias/${encodeURIComponent(id)}`,
    payload,
    { withCredentials: true }
  );
  return normalizeId(data);
};
