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
export interface PurchaseTicketsDto {
  eventId: string;
  buyer: TicketBuyer;
  date: string; // ISO: "YYYY-MM-DD" dentro del rango del evento
  quantity: number; // 1..20
  channel?: TicketChannel; // default backend: "online"
  presale?: boolean; // true para preventa
  attachQrImages?: boolean; // (si algún día lo usas, hoy el back siempre genera el QR)
}

export interface PurchaseTicketsResponse {
  ok: boolean;
  tickets: Ticket[];
}

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

/** Stats diarias por evento */
export interface DailyStatsResponse {
  eventId: string;
  days: Record<
    string, // "YYYY-MM-DD"
    {
      sold: number;
      checked_in: number;
      refunded: number;
      canceled: number;
      total: number;
    }
  >;
}

/** Stats tipo calendario (usa eventCalendar del back) */
export interface CalendarDayStats {
  date: string; // "YYYY-MM-DD"
  price: number;
  cap: number;
  kind: string; // opening | normal | penultimate | last | etc
  isActive?: boolean;
  sold: number;
  checked_in: number;
  refunded: number;
  canceled: number;
  total: number;
  used: number;
  remaining: number;
  utilization: number; // 0..1
}

export interface CalendarStatsResponse {
  eventId: string;
  days: CalendarDayStats[];
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

/** Reactivar ticket */
export interface ReactivateTicketResponse {
  ok: boolean;
  ticket: {
    id: string;
    shortCode?: string;
    status: TicketStatus;
    eventDay: string;
    qrToken?: string;
    scannedAt: string | null;
  };
}

/** ────────── DTO específico para pago con Mercado Pago ────────── */
export interface PayWithMercadoPagoPayload {
  eventId: string;
  date: string;       // "YYYY-MM-DD"
  quantity: number;
  channel?: TicketChannel;
  presale?: boolean;
  buyer: TicketBuyer; // { name, email }
  card: {
    token: string;
    installments: number;
    paymentMethodId: string;
    issuerId: string;
    identification?: {
      type: string;
      number: string;
    };
  };
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
 * Compra de tickets (soporta preventa). Devuelve tickets con qrToken y (opcional) qrDataUrl.
 * POST /ticket/tickets/purchase
 *
 * 👉 Esta función sigue existiendo por compatibilidad (panel, admin, etc.)
 */
export const purchaseTickets = async (payload: PurchaseTicketsDto) => {
  const { data } = await apiClient.post<PurchaseTicketsResponse>(
    "/ticket/tickets/purchase",
    payload,
    { withCredentials: true },
  );

  return {
    ok: data.ok,
    tickets: data.tickets.map(normalizeId),
  };
};

/**
 * Pago + compra de tickets usando Mercado Pago (nuevo endpoint /pay).
 * POST /ticket/tickets/pay
 */
export const payTicketsWithMercadoPago = async (
  payload: PayWithMercadoPagoPayload,
) => {
  const { data } = await apiClient.post<PurchaseTicketsResponse>(
    "/ticket/tickets/pay",
    payload,
    { withCredentials: true },
  );

  return {
    ok: data.ok,
    tickets: data.tickets.map(normalizeId),
  };
};
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

/**
 * Obtener un ticket por ID.
 * GET /ticket/tickets/:id
 */
export const getTicketById = async (id: string) => {
  const { data } = await apiClient.get<Ticket>(`/ticket/tickets/${id}`, {
    withCredentials: true,
  });
  return normalizeId(data);
};

/**
 * Reactivar un ticket (resetear estado / opcionalmente QR).
 * POST /ticket/tickets/:id/reactivate
 */
export const reactivateTicket = async (
  id: string,
  opts: { regenerateQr?: boolean } = {},
) => {
  const { data } = await apiClient.post<ReactivateTicketResponse>(
    `/ticket/tickets/${id}/reactivate`,
    opts,
    { withCredentials: true },
  );

  return {
    ...data,
    ticket: {
      ...data.ticket,
      id: data.ticket.id,
    },
  };
};

/**
 * Stats diarias por evento (conteos por estado).
 * GET /ticket/tickets/stats/daily?eventId=...
 */
export const getDailyStats = async (eventId: string) => {
  const { data } = await apiClient.get<DailyStatsResponse>(
    `/ticket/tickets/stats/daily?eventId=${encodeURIComponent(eventId)}`,
    { withCredentials: true },
  );
  return data;
};

/**
 * Stats estilo calendario (cap, price, used, remaining, etc).
 * GET /ticket/tickets/stats/calendar?eventId=...
 */
export const getCalendarStats = async (eventId: string) => {
  const { data } = await apiClient.get<CalendarStatsResponse>(
    `/ticket/tickets/stats/calendar?eventId=${encodeURIComponent(eventId)}`,
    { withCredentials: true },
  );
  return data;
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
 * Crear/actualizar en bulk los días de un evento (seed de los 4 días, panel, etc.).
 * POST /ticket/tickets/events/:eventId/days/bulk
 */
export const upsertTicketDaysBulk = async (
  eventId: string,
  days: UpsertTicketDayInput[],
) => {
  const { data } = await apiClient.post<TicketDaysResponse>(
    `/ticket/tickets/events/${encodeURIComponent(eventId)}/days/bulk`,
    { days },
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

export const downloadQrPng = (ticket: Ticket, filename?: string) => {
  if (!ticket.qrDataUrl) return;

  const a = document.createElement("a");
  a.href = ticket.qrDataUrl;
  a.download = filename || `ticket-${ticket.shortCode || ticket.id}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
