import apiClient from "@/axios";

/** ────────── Tipos base ────────── */
export interface PaginationParams {
  limit?: number;
  cursor?: string; // paginación basada en cursor (desde el backend)
}

export interface PaginatedCursorResponse<T> {
  data: T[];
  nextCursor: string | null;
}

export type TicketStatus = "sold" | "refunded" | "canceled" | "checked_in";
export type TicketChannel = "online" | "presale" | "onsite";

export interface TicketBuyer {
  name: string;
  email: string;
}

export interface Ticket {
  id: string;
  _id?: string;
  eventId: string;
  buyer: TicketBuyer;
  eventDay: string; // ISO (YYYY-MM-DD) del día del ticket
  price: number;
  currency: string; // p.ej. "COP"
  saleChannel: TicketChannel;
  status: TicketStatus;
  qrToken?: string; // presente al comprar
  shortCode?: string; // humano-legible
  scannedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;

  /** Sólo en respuesta de compra (conveniencia) */
  qrDataUrl?: string; // data:image/png;base64,....
}

/** ────────── DTOs ────────── */
export interface ValidateQrDto {
  token: string; // qrToken (JWT) leído del QR
}

export interface ValidateQrResponse {
  ok: boolean;
  status: "checked_in" | "already_checked_in";
  sameDay: boolean;
  ticket: {
    id: string;
    shortCode?: string;
    eventDay?: string;
    scannedAt?: string;
  };
}

/** Filtros de listado */
export interface TicketFilters extends PaginationParams {
  eventId?: string;
  email?: string; // buyer.email
  date?: string; // YYYY-MM-DD (día del ticket)
  status?: TicketStatus;
}

/** ────────── Ticket Days (configurable por evento) ────────── */
export type TicketDayKind = "opening" | "normal" | "penultimate" | "last" | string;

export interface TicketDaySummary {
  id: string;
  _id?: string;
  eventId: string;
  date: string; // "YYYY-MM-DD"
  display: string; // "Jue 20 Nov"
  cap: number;
  price: number;
  kind: TicketDayKind;
  isActive: boolean;
  sold: number;
  checked_in: number;
  used: number;
  remaining: number;
  utilization: number;
  isToday: boolean;
}

export interface TicketDaysResponse {
  eventId: string;
  days: TicketDaySummary[];
}

// Para hacer el bulk desde el panel / seed inicial
export interface UpsertTicketDayInput {
  date: string; // "2025-11-20"
  display: string; // "Jue 20 Nov"
  cap: number;
  price: number;
  kind?: TicketDayKind;
  isActive?: boolean;
}

/** ────────── Utils internos ────────── */
const normalizeId = <T extends { id?: string; _id?: string }>(obj: T) => ({
  ...obj,
  id: (obj as any).id || (obj as any)._id,
});

const buildQuery = (params: Record<string, any> = {}) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(
          typeof v === "string" ? v : String(v),
        )}`,
    )
    .join("&");

/** ────────── Endpoints ────────── */

/**
 * Validación del QR en puerta. Marca el ticket como checked_in (si procede).
 * POST /ticket/tickets/validate
 */
export const validateQr = async (payload: ValidateQrDto) => {
  const { data } = await apiClient.post<ValidateQrResponse>(
    "/ticket/tickets/validate",
    payload,
    { withCredentials: true },
  );
  return data;
};

/**
 * Listado de tickets (cursor-based).
 * GET /ticket/tickets
 * Ej: getTickets({ eventId, limit: 50, cursor })
 */
export const getTickets = async (filters: TicketFilters = {}) => {
  const qs = buildQuery(filters);
  const url = `/ticket/tickets${qs ? `?${qs}` : ""}`;

  const { data } = await apiClient.get<PaginatedCursorResponse<Ticket>>(url, {
    withCredentials: true,
  });

  return {
    data: data.data.map(normalizeId),
    nextCursor: data.nextCursor,
  };
};

/** ────────── Ticket Days (configurable por evento) ────────── */

/**
 * Obtener configuración de días de ticket para un evento + stats de ventas.
 * GET /ticket/tickets/events/:eventId/days
 */
export const getTicketDays = async (eventId: string) => {
  const { data } = await apiClient.get<TicketDaysResponse>(
    `/ticket/tickets/events/${encodeURIComponent(eventId)}/days`,
    { withCredentials: true },
  );

  return {
    eventId: data.eventId,
    days: data.days.map(normalizeId),
  };
};

/**
 * Actualizar un día específico (cap, precio, kind, isActive).
 * PATCH /ticket/tickets/days/:id
 */
export const updateTicketDay = async (
  id: string,
  payload: Partial<
    Pick<UpsertTicketDayInput, "display" | "cap" | "price" | "kind" | "isActive">
  > & {
    display?: string;
  },
) => {
  const { data } = await apiClient.patch<TicketDaySummary>(
    `/ticket/tickets/days/${id}`,
    payload,
    { withCredentials: true },
  );
  return normalizeId(data);
};
