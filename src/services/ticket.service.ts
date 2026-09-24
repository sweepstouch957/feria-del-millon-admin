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

export type TicketStatus = "invited" | "sold" | "refunded" | "canceled" | "checked_in";
export type TicketType = "general" | "allpass" | "preview" | "empresa" | "2x1" | "estudiante" | "invitacion";

export const TICKET_TYPE_LABEL: Record<TicketType, string> = {
  general: "General",
  allpass: "All pass 4 días",
  preview: "Preview",
  empresa: "Empresa",
  "2x1": "Promoción 2x1",
  estudiante: "Estudiante",
  invitacion: "Invitación",
};
export type TicketChannel = "online" | "presale" | "onsite";

export interface TicketBuyer {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  nit?: string;
  documentNumber?: string;
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
  type?: TicketType;
  allDays?: boolean;
  admits?: number;
  inviteCategory?: string;
  companionName?: string;
  paymentMethod?: string;
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
    type?: TicketType;
    name?: string;
    companionName?: string;
    allDays?: boolean;
    admits?: number;
    usedToday?: number;
    validHours?: { from: string; to: string };
  };
}

/** Filtros de listado */
export interface TicketFilters extends PaginationParams {
  eventId?: string;
  email?: string; // buyer.email
  date?: string; // YYYY-MM-DD (día del ticket)
  status?: TicketStatus;
  type?: TicketType;
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

/** ────────── Preventa: tipos de entrada por evento ────────── */

export type TicketTypeKey = "general" | "allpass" | "preview" | "empresa" | "2x1" | "estudiante";
export type TicketSaleClosedReason = "disabled" | "not_started" | "ended" | "sold_out" | null;

export interface TicketTypeConfig {
  key: TicketTypeKey;
  label: string;
  desc?: string;
  /** null = lo pone el día elegido (general, 2x1, estudiante). */
  price: number | null;
  pickDay: boolean;
  allDays: boolean;
  quantities: number[] | null;
  maxQty: number | null;
  cap: number | null;
  sold: number;
  remaining: number | null;
  enabled: boolean;
  salesFrom: string | null; // ISO
  salesTo: string | null; // ISO
  open: boolean;
  closedReason: TicketSaleClosedReason;
  requiresStudentId: boolean;
  bonus?: { weekday: number; from: string; to: string } | null;
  sortOrder: number;
}

export interface TicketTypesResponse {
  eventId: string;
  eventName: string;
  validFrom: string;
  validTo: string;
  currency: string;
  types: TicketTypeConfig[];
}

/** Lo que se envía al guardar: campo ausente = sin cambios, null = vuelve al valor del código. */
export interface SaveTicketTypeInput {
  key: TicketTypeKey;
  enabled?: boolean;
  label?: string | null;
  description?: string | null;
  price?: number | null;
  cap?: number | null;
  maxQty?: number | null;
  quantities?: number[];
  salesFrom?: string | null;
  salesTo?: string | null;
}

/** GET /ticket/tickets/events/:eventId/ticket-types (público) */
export const getTicketTypes = async (eventId: string) => {
  const { data } = await apiClient.get<TicketTypesResponse>(
    `/ticket/tickets/events/${encodeURIComponent(eventId)}/ticket-types`,
    { withCredentials: true },
  );
  return data;
};

/** PUT /ticket/tickets/events/:eventId/ticket-types (admin) */
export const saveTicketTypes = async (eventId: string, types: SaveTicketTypeInput[]) => {
  const { data } = await apiClient.put<TicketTypesResponse>(
    `/ticket/tickets/events/${encodeURIComponent(eventId)}/ticket-types`,
    { types },
    { withCredentials: true },
  );
  return data;
};

/** ────────── Taquilla (venta en sitio) ────────── */
export interface BoxOfficeSaleInput {
  eventId: string;
  type: Exclude<TicketType, "invitacion">;
  date?: string; // YYYY-MM-DD (tipos de un día)
  quantity: number;
  method: "cash" | "card_offline";
  buyer: TicketBuyer;
  idempotencyKey?: string;
}

/** POST /ticket/tickets/box-office — el QR también se envía al correo del comprador. */
export const sellAtBoxOffice = async (input: BoxOfficeSaleInput) => {
  const { data } = await apiClient.post<{ ok: boolean; tickets: Ticket[]; payment: { amount: number } }>(
    "/ticket/tickets/box-office",
    input,
    { withCredentials: true },
  );
  return { ...data, tickets: data.tickets.map(normalizeId) };
};

/** ────────── Informe de asistentes ────────── */
export interface AttendanceBucket { key: string; label: string; tickets: number; persons: number; attended: number }
export interface AttendanceRow {
  shortCode: string; name: string; email: string; phone: string; company: string; companion: string;
  type: string; category: string; method: string; price: number; persons: number; attended: number;
  checkedAt: string | null;
}
export interface AttendanceReport {
  eventId: string; date: string;
  totals: Omit<AttendanceBucket, "key" | "label">;
  byCategory: AttendanceBucket[];
  byType: AttendanceBucket[];
  rows: AttendanceRow[];
}

/** GET /ticket/tickets/reports/attendance?eventId&date */
export const getAttendanceReport = async (eventId: string, date: string) => {
  const { data } = await apiClient.get<AttendanceReport>(
    `/ticket/tickets/reports/attendance?${buildQuery({ eventId, date })}`,
    { withCredentials: true },
  );
  return data;
};

/** ────────── Invitaciones ────────── */
export interface CreateInvitationsInput {
  eventId: string;
  date?: string;
  allDays?: boolean;
  admits?: number;
  category?: string;
  invitees: { name: string; email: string }[];
}

/** POST /ticket/tickets/invitations — crea y envía el correo con botón de confirmación. */
export const createInvitations = async (input: CreateInvitationsInput) => {
  const { data } = await apiClient.post<{ created: number; skipped: { email: string; reason: string }[] }>(
    "/ticket/tickets/invitations",
    input,
    { withCredentials: true },
  );
  return data;
};

export const resendInvitation = async (ticketId: string) => {
  await apiClient.post(`/ticket/tickets/invitations/${encodeURIComponent(ticketId)}/resend`, {}, { withCredentials: true });
};
