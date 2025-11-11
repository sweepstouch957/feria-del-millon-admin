/* eslint-disable @typescript-eslint/no-explicit-any */
// services/catalog/artworks.service.ts
import apiClient from "@/axios";

/* ───────────────────────── Tipos base ───────────────────────── */

export type ArtworkStatus = "draft" | "published" | "archived";

export interface ArtworkDoc {
  id: string;
  _id?: string; // compat
  event: string; // ObjectId
  pavilion?: string | null; // ObjectId o null
  technique?: string; // ObjectId de Technique o string normalizado
  artist: string; // ObjectId de User (artista)
  title: string;
  slug?: string;
  year?: number;
  description?: string;
  price?: number;
  currency?: string; // "COP" por defecto si lo define backend
  stock?: number; // si viene, backend siembra copias
  image?: string;
  images?: string[];
  imageMeta?: Record<string, any>;
  tags?: string[];
  channel?: "event" | "online";
  defaultChannel?: "event" | "online";
  status?: ArtworkStatus; // "published" filtra en list
  meta?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateArtworkInput {
  // Requeridos
  event: string;
  title: string;
  // Artista: EITHER/OR
  artist?: string; // ObjectId
  artistEmail?: string; // si no pasas artist
  // Opcionales
  pavilion?: string | null;
  technique?: string; // ObjectId o texto (normaliza backend)
  slug?: string;
  year?: number;
  description?: string;
  price?: number;
  currency?: string; // default "COP"
  stock?: number; // si se envía, siembra copias internas
  images?: string[];
  image?: string;
  tags?: string[];
  status?: ArtworkStatus;
}

export interface CreateArtworkResponse extends ArtworkDoc {
  copiesCreated: number;
  qrPublic: {
    ok: boolean;
    serial?: string;
    target?: string;
    imageUrl?: string;
    publicId?: string;
    generatedAt?: string;
  };
}

/** Filtros del listado (cursor-based) — alineados al controller */
export interface CursorListParams {
  event?: string;
  pavilion?: string | "null"; // "null" para filtrar explícitamente vacíos
  technique?: string | string[]; // id | csv
  artist?: string | string[]; // id | csv (User._id)
  tagId?: string;
  tags?: string | string[]; // csv
  q?: string; // text search
  inStock?: boolean; // true/false
  channel?: "event" | "online";
  allowOnlineAfterEvent?: boolean; // true/false
  minPrice?: number;
  maxPrice?: number;
  hasImage?: boolean;

  // Paginación & orden
  limit?: number; // default 24 (máx 60)
  cursor?: string | undefined; // "<sortValue>|<id>" o solo "<id>"
  sortBy?: "createdAt" | "price" | "_id";
  sortDir?: "asc" | "desc";

  // Proyección opcional (campos extra)
  project?: string | string[];
}

/** Respuesta “cruda” del backend */
export interface RawListResponse<T> {
  docs: T[];
  pageInfo: {
    limit: number;
    sortBy: "createdAt" | "price" | "_id";
    sortDir: "asc" | "desc";
    nextCursor: string | null;
    hasNext: boolean;
    total?: number;
  };
}

/** Respuesta normalizada para el front */
export interface CursorListResponse<T> {
  docs: T[];
  nextCursor: string | null;
  pageInfo: RawListResponse<T>["pageInfo"];
}

/** Detalle por ID */
export interface ArtworkDetailResponse {
  doc: ArtworkDoc & {
    artistInfo?: any;
    techniqueInfo?: any;
    pavilionInfo?: any;
    meta:any
  };
  copies: Array<{
    serial?: string;
    number?: number;
    total?: number;
    status?: string;
    price?: number;
    priceAtCreation?: number;
    createdAt?: string;
  }>;
  meta:any
  relatedArtworks: ArtworkDoc[];
}

/** Payload para PATCH (solo campos permitidos por el controller) */
export type PatchArtworkDto = Partial<{
  title: string;
  slug: string;
  description: string;
  dimensionsText: string;
  price: number;
  currency: string;
  stock: number;
  image: string;
  images: string[];
  imageMeta: Record<string, any>;
  event: string;
  pavilion: string | null;
  artist: string;
  technique: string;
  tags: string[];
  status: ArtworkStatus;
  allowOnlineAfterEvent: boolean;
  defaultChannel: "event" | "online";
  fulfillmentBy: string;
  shippingNotes: string;
  contactEmail: string;
  contactPhone: string;
  meta: any;
  tagId: string;
}>;

/* ───────────────────────── Helpers ───────────────────────── */

const normalizeId = <T extends { id?: string; _id?: string }>(obj: T) => ({
  ...obj,
  id: obj.id || (obj as any)._id,
});

const toCsv = (v: unknown) =>
  Array.isArray(v) ? v.join(",") : (v as string | undefined);

const buildQuery = (params: Record<string, any> = {}) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

/* ───────────────────────── Endpoints ───────────────────────── */

/**
 * GET (cursor-based) /catalogs/artworks
 * Devuelve status: "published" + pageInfo con nextCursor.
 */
export const listArtworks = async (
  filters: CursorListParams = {}
): Promise<CursorListResponse<ArtworkDoc>> => {
  // CSVs que el controller soporta
  const queryObj: Record<string, any> = {
    ...filters,
    technique: toCsv(filters.technique),
    artist: toCsv(filters.artist),
    tags: toCsv(filters.tags),
    project: toCsv(filters.project),
  };

  const qs = buildQuery(queryObj);
  const url = `/catalogs/artworks${qs ? `?${qs}` : ""}`;

  const { data } = await apiClient.get<RawListResponse<ArtworkDoc>>(url, {
    withCredentials: true,
  });

  const docs = (data.docs || []).map(normalizeId);

  return {
    docs,
    nextCursor: data.pageInfo?.nextCursor ?? null,
    pageInfo: data.pageInfo ?? {
      limit: filters.limit ?? 24,
      sortBy: (filters.sortBy as any) ?? "createdAt",
      sortDir: (filters.sortDir as any) ?? "desc",
      nextCursor: null,
      hasNext: false,
    },
  };
};

/**
 * POST /catalogs/artworks
 * - Acepta { artist } o { artistEmail }
 * - Si `stock` > 0, siembra copias ArtworkCopy
 * - Genera QR público y lo guarda en doc.meta.qrPublic (retorna { qrPublic })
 */
export const createArtwork = async (
  payload: CreateArtworkInput
): Promise<CreateArtworkResponse> => {
  const { data } = await apiClient.post<CreateArtworkResponse>(
    "/catalogs/artworks",
    payload,
    { withCredentials: true }
  );
  return normalizeId(data) as CreateArtworkResponse;
};

/**
 * GET /catalogs/artworks/:id
 * Retorna { doc, copies, relatedArtworks }
 */
export const getArtworkById = async (
  id: string
): Promise<ArtworkDetailResponse> => {
  const { data } = await apiClient.get<ArtworkDetailResponse>(
    `/catalogs/artworks/${encodeURIComponent(id)}`,
    { withCredentials: true }
  );

  // Normalizamos ids de doc y related
  const docNorm = normalizeId(data.doc) as ArtworkDetailResponse["doc"];
  const relatedNorm = (data.relatedArtworks || []).map(normalizeId);

  return {
    ...data,
    doc: docNorm,
    relatedArtworks: relatedNorm as ArtworkDoc[],
  };
};

/**
 * PATCH /catalogs/artworks/:id
 * Update parcial — controller filtra campos permitidos.
 * Respuesta: { ok: true, doc }
 */
export const patchArtwork = async (
  id: string,
  payload: PatchArtworkDto
): Promise<{ ok: boolean; doc: ArtworkDoc }> => {
  const { data } = await apiClient.patch<{ ok: boolean; doc: ArtworkDoc }>(
    `/catalogs/artworks/${encodeURIComponent(id)}`,
    payload,
    { withCredentials: true }
  );
  return { ok: data.ok, doc: normalizeId(data.doc) as ArtworkDoc };
};

/**
 * (Opcional legacy) GET /catalogs/artworks/:idOrSlug
 * Si mantienes soporte por slug, deja este helper; de lo contrario usa getArtworkById.
 */
export const getArtworkByIdOrSlug = async (
  idOrSlug: string
): Promise<ArtworkDoc> => {
  const { data } = await apiClient.get<ArtworkDoc>(
    `/catalogs/artworks/${encodeURIComponent(idOrSlug)}`,
    { withCredentials: true }
  );
  return normalizeId(data);
};
