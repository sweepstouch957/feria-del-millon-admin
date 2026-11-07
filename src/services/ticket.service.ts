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

export type TicketStatus = "invited" | "declined" | "sold" | "refunded" | "canceled" | "checked_in";
export type TicketType = "general" | "allpass" | "empresa" | "2x1" | "invitacion";

export const TICKET_TYPE_LABEL: Record<TicketType, string> = {
  general: "General",
  allpass: "All pass 4 días",
  empresa: "Empresa",
  "2x1": "Promoción 2x1",
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
  /** La llena el invitado al inscribirse desde el enlace del correo. */
  address?: string;
  firstName?: string;
  lastName?: string;
  documentType?: string;
  country?: string;
  city?: string;
  position?: string;
  corporateEmail?: string;
  dataConsentAt?: string;
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
  /** "Para quién" del enlace por el que se registró: la empresa o el grupo. */
  linkLabel?: string;
  companionName?: string;
  inviteImage?: string;
  inviteDeadline?: string;
  /** Pase de acompañante: id del pase del anfitrión y su nombre. */
  inviteParent?: string;
  inviteHostName?: string;
  declinedAt?: string;
  whatsappSentAt?: string;
  companionRequestSentAt?: string;
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
/** token = qrToken (JWT) leído del QR; code = código corto digitado a mano. */
export type ValidateQrDto = ({ token: string } | { code: string }) & {
  /** Práctica: ignora la fecha y no registra el ingreso. */
  practice?: boolean;
};

export interface ValidateQrResponse {
  ok: boolean;
  /** Respuesta en modo práctica: no se registró el ingreso. */
  practice?: boolean;
  status: "checked_in" | "already_checked_in";
  sameDay: boolean;
  ticket: {
    id: string;
    shortCode?: string;
    eventDay?: string;
    scannedAt?: string;
    /** Quién lo validó en puerta. */
    scannedBy?: string;
    type?: TicketType;
    name?: string;
    companionName?: string;
    /** Empresa o grupo del enlace de invitación del que viene. */
    source?: string;
    allDays?: boolean;
    admits?: number;
    usedToday?: number;
    validHours?: { from: string; to: string };
  };
}

export interface CheckinRow {
  id: string;
  shortCode?: string;
  type: TicketType;
  name?: string;
  companionName?: string;
  admits: number;
  /** Ingresos registrados ese día con el QR (all pass / invitación doble). */
  entries: number;
  scannedAt: string;
  scannedBy?: string;
  /** Veces que se volvió a habilitar. */
  reactivations: number;
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
 * Ingresos del día: quién entró, a qué hora y quién validó.
 * GET /ticket/tickets/checkins
 */
export const getCheckins = async (params: { eventId: string; date?: string; q?: string }) => {
  const { data } = await apiClient.get<{ date: string; total: number; rows: CheckinRow[] }>(
    `/ticket/tickets/checkins?${buildQuery(params)}`,
    { withCredentials: true },
  );
  return data;
};

/**
 * Vuelve a habilitar un QR ya usado (deshace el último ingreso). Solo taquilla/staff.
 * POST /ticket/tickets/:id/reactivate
 */
export const reactivateTicket = async (id: string, reason: string) => {
  const { data } = await apiClient.post(`/ticket/tickets/${id}/reactivate`, { reason }, { withCredentials: true });
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

export type TicketTypeKey = "general" | "allpass" | "empresa" | "2x1";
export type TicketSaleClosedReason = "disabled" | "not_started" | "ended" | "sold_out" | null;

export interface TicketTypeConfig {
  key: TicketTypeKey;
  label: string;
  desc?: string;
  /** Banner de la tarjeta en la tienda (URL de Cloudinary). */
  image?: string | null;
  /** null = lo pone el día elegido (general, 2x1, estudiante). */
  price: number | null;
  pickDay: boolean;
  allDays: boolean;
  quantities: number[] | null;
  /** Precio por persona según el paquete (empresas: 20 → 55.000, 50/100 → 44.000). */
  packPrices?: Record<string, number> | null;
  maxQty: number | null;
  cap: number | null;
  sold: number;
  remaining: number | null;
  enabled: boolean;
  salesFrom: string | null; // ISO
  salesTo: string | null; // ISO
  open: boolean;
  closedReason: TicketSaleClosedReason;
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
  /** "" quita el banner; ausente no lo toca. */
  image?: string;
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
  method: "cash" | "card_offline" | "transfer";
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
  type: string; category: string; method: string; seller?: string; price: number; persons: number; attended: number;
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

/** ────────── Ventas de entradas ────────── */
export interface TicketSale {
  id: string;
  buyer: TicketBuyer;
  type: TicketType;
  price: number;
  paymentMethod?: string;
  /** Pago mixto (ej. parte efectivo, parte datáfono); paymentMethod es el de más plata. */
  paymentSplit?: { method: string; amount: number }[];
  saleChannel?: TicketChannel;
  eventDay: string;
  allDays?: boolean;
  anyDay?: boolean;
  shortCode?: string;
  status: TicketStatus;
  createdAt: string;
  inviteLink?: string;
  /** "Para quién" del enlace: la empresa o el grupo. */
  linkLabel?: string;
  /** Quién la vendió en taquilla; vacío si se compró en línea. */
  sellerName?: string;
}

/** Entradas vendidas (sin invitaciones), con método de pago y comprador. */
export const getTicketSales = async (eventId: string) => {
  const { data } = await apiClient.get<{ rows: TicketSale[] }>("/ticket/tickets/reports/sales", {
    params: { eventId },
    withCredentials: true,
  });
  return data.rows;
};

export interface TicketPerson {
  email: string;
  name: string;
  phone: string;
  document: string;
  addressLine: string;
  cityName: string;
  source: string;
  kind: "invited" | "companion" | "ticket";
  confirmed: boolean;
}

/** Invitados y compradores de entradas, para que la caja no les pida los datos otra vez. */
export const getTicketPeople = async (eventId: string) => {
  const { data } = await apiClient.get<TicketPerson[]>("/ticket/tickets/people", {
    params: { eventId },
    withCredentials: true,
  });
  return data;
};

/** ────────── Invitaciones ────────── */
export interface CreateInvitationsInput {
  eventId: string;
  date?: string;
  allDays?: boolean;
  /** Un día a elección entre los de la feria (una sola entrada). */
  anyDay?: boolean;
  admits?: number;
  category?: string;
  /** Datos extra de la lista (Excel): prellenan su formulario. */
  invitees: { name: string; email: string; firstName?: string; lastName?: string; phone?: string; city?: string; address?: string }[];
  /** Imagen de cabecera del correo (URL https ya subida). */
  image?: string;
  /** Cuerpo del correo; párrafos separados por línea en blanco. Vacío = el de siempre. */
  message?: string;
  /** "Confirme antes del…" (YYYY-MM-DD). Solo se muestra; no bloquea. */
  deadline?: string;
}

/** POST /ticket/tickets/invitations — crea y envía el correo con botón de confirmación. */
export const createInvitations = async (input: CreateInvitationsInput) => {
  const { data } = await apiClient.post<{ created: number; skipped: { email: string; reason: string }[]; updated?: string[] }>(
    "/ticket/tickets/invitations",
    input,
    { withCredentials: true },
  );
  return data;
};

/** HTML exacto del correo de invitación, para la vista previa del panel. */
export const previewInvitation = async (
  input: Pick<CreateInvitationsInput, "eventId" | "image" | "message" | "admits" | "deadline"> & { name?: string },
) => {
  const { data } = await apiClient.post<{ html: string }>("/ticket/tickets/invitations/preview", input, { withCredentials: true });
  return data.html;
};

/** Manda el correo de invitación y/o el del pase, de muestra, a estos correos. */
/* ────────── Invitaciones: listado paginado del panel ────────── */
export interface InvitationStats {
  sent: number;
  pending: number;
  confirmed: number;
  declined: number;
  companions: number;
  attended: number;
}
export type InvitationStatusFilter = "" | "pending" | "confirmed" | "declined" | "attended" | "canceled";

export const getInvitationsAdmin = async (params: {
  eventId: string; page?: number; limit?: number; q?: string; status?: InvitationStatusFilter; all?: boolean;
}) => {
  const { all, ...rest } = params;
  const { data } = await apiClient.get<{ rows: Ticket[]; total: number; page: number; pages: number; limit: number; stats: InvitationStats }>(
    "/ticket/tickets/invitations-admin",
    { params: { ...rest, ...(all ? { all: 1 } : {}) }, withCredentials: true },
  );
  return data;
};

/** Correos ya invitados en la feria (titulares), para el resumen antes de enviar. */
export const getInvitedEmails = async (eventId: string) => {
  const { data } = await apiClient.get<string[]>("/ticket/tickets/invitations-admin/emails", { params: { eventId }, withCredentials: true });
  return data;
};

/* ────────── Enlaces públicos de registro (/i/:code) ────────── */
export interface InviteLink {
  id: string;
  code: string;
  label: string;
  category: string;
  admits: number;
  allDays: boolean;
  anyDay: boolean;
  date: string | null;
  maxUses: number;
  uses: number;
  remaining: number;
  active: boolean;
  open: boolean;
  createdAt?: string;
  /** Correo del enlace: pieza, texto y fecha límite (YYYY-MM-DD). Vacío = los de siempre. */
  emailImage?: string;
  emailMessage?: string;
  emailDeadline?: string;
  emailsSent?: number;
  /** Logo del aliado: arriba del correo y de la página /i/:code (que también muestra emailMessage). */
  logo?: string;
  /** Reemplaza la línea de días del pase con QR (correo y página). Vacío = la de siempre. */
  passNote?: string;
}

export const listInviteLinks = async (eventId: string) => {
  const { data } = await apiClient.get<InviteLink[]>("/ticket/tickets/invite-links", { params: { eventId }, withCredentials: true });
  return data;
};

export interface InviteLinkPerson {
  id: string;
  buyer: TicketBuyer;
  status: TicketStatus;
  shortCode?: string;
  admits?: number;
  checkIns?: { day: string; at: string }[];
  createdAt?: string;
  whatsappSentAt?: string;
}
export type InviteLinkRegistration = InviteLinkPerson & { companionName?: string; companions: InviteLinkPerson[] };

/** Quiénes se registraron por este enlace, con todos sus datos y acompañantes. */
export const listInviteLinkRegistrations = async (id: string) => {
  const { data } = await apiClient.get<InviteLinkRegistration[]>(
    `/ticket/tickets/invite-links/${encodeURIComponent(id)}/registrations`,
    { withCredentials: true },
  );
  return data;
};

export const createInviteLink = async (input: {
  eventId: string; code?: string; label?: string; category?: string; admits?: number;
  allDays?: boolean; anyDay?: boolean; date?: string; maxUses?: number;
}) => {
  const { data } = await apiClient.post<InviteLink>("/ticket/tickets/invite-links", input, { withCredentials: true });
  return data;
};

export const updateInviteLink = async (
  id: string,
  body: { active?: boolean; maxUses?: number; label?: string; emailImage?: string; emailMessage?: string; emailDeadline?: string; logo?: string; passNote?: string; allDays?: boolean },
) => {
  const { data } = await apiClient.patch<InviteLink & { passesUpdated?: number }>(`/ticket/tickets/invite-links/${encodeURIComponent(id)}`, body, { withCredentials: true });
  return data;
};

/** HTML del correo del enlace con el borrador (sin guardar). */
export const previewInviteLinkEmail = async (id: string, draft: { emailImage?: string; emailMessage?: string; emailDeadline?: string; logo?: string }) => {
  const { data } = await apiClient.post<{ html: string }>(`/ticket/tickets/invite-links/${encodeURIComponent(id)}/preview`, draft, { withCredentials: true });
  return data.html;
};

/** Manda el correo del enlace a esos correos (test = solo prueba, asunto [PRUEBA]). */
export const sendInviteLinkEmails = async (id: string, emails: string[], test = false) => {
  const { data } = await apiClient.post<{ ok: boolean; sent?: number; failed?: { email: string; error: string }[]; queued?: boolean; total?: number }>(
    `/ticket/tickets/invite-links/${encodeURIComponent(id)}/send`,
    { emails, test },
    { withCredentials: true },
  );
  return data;
};

export const sendInvitationTest = async (
  input: Pick<CreateInvitationsInput, "eventId" | "image" | "message" | "admits" | "deadline" | "allDays" | "anyDay"> & {
    emails: string[];
    kinds: ("invitation" | "pass")[];
    name?: string;
  },
) => {
  const { data } = await apiClient.post<{ ok: boolean; sent: string[]; failed: { email: string; error: string }[] }>(
    "/ticket/tickets/invitations/test",
    input,
    { withCredentials: true },
  );
  return data;
};

/** Corre el "confirme antes del" de todas las invitaciones pendientes (YYYY-MM-DD, hora Bogotá). */
export const extendInvitationDeadline = async (eventId: string, deadline: string) => {
  const { data } = await apiClient.post<{ ok: boolean; updated: number }>("/ticket/tickets/invitations/deadline", { eventId, deadline }, { withCredentials: true });
  return data;
};

/** Cambia el día de entradas de día fijo y le reenvía el correo al comprador. */
export const moveTicketsDay = async (ids: string[], date: string) => {
  const { data } = await apiClient.post<{ ok: boolean; moved: number; date: string; emailed: number }>(
    "/ticket/tickets/move-day", { ids, date }, { withCredentials: true },
  );
  return data;
};

export type DeliveryIssue = {
  id: string; name?: string; email: string; phone?: string; status: string; hostName?: string;
  state: "bounced" | "soft-bounced" | "rejected"; at: string;
  /** Motivo en palabras. retry=false → el correo está mal: hay que corregirlo. */
  reason: string; retry: boolean;
};

/** Correos de invitación/pase que no llegaron (Mailchimp). Tarda unos segundos; el servidor lo guarda 15 min. */
export const getInvitationDelivery = async (eventId: string, refresh = false) => {
  const { data } = await apiClient.get<{ rows: DeliveryIssue[]; partial: boolean; checkedAt: string }>(
    "/ticket/tickets/invitations-admin/delivery", { params: { eventId, ...(refresh ? { refresh: 1 } : {}) }, withCredentials: true, timeout: 120_000 },
  );
  return data;
};

/** Reenvía a todos los que se puede (no a "el correo no existe"). */
export const resendFailedDeliveries = async (eventId: string) => {
  const { data } = await apiClient.post<Omit<ResendResult, "kind">>(
    "/ticket/tickets/invitations-admin/delivery/resend", { eventId }, { withCredentials: true, timeout: 300_000 },
  );
  return data;
};

/** Corrige el correo (y opcionalmente el nombre) de un invitado o acompañante y le reenvía lo suyo. */
export const fixInvitationEmail = async (id: string, email: string, name?: string) => {
  const { data } = await apiClient.patch<ResendResult>(`/ticket/tickets/invitations/${encodeURIComponent(id)}/email`, { email, ...(name ? { name } : {}) }, { withCredentials: true });
  return data;
};

export type BatchPass = { id: string; name: string; shortCode: string; qrToken: string };
/** Pases confirmados sin correo ("Bavaria 1..N", todos los días): QR listo para entregar como imagen. */
export const createBatchPasses = async (eventId: string, label: string, count: number) => {
  const { data } = await apiClient.post<{ eventName: string; passes: BatchPass[] }>(
    "/ticket/tickets/invitations/batch-passes", { eventId, label, count }, { withCredentials: true, timeout: 120_000 },
  );
  return data;
};

export type ResendResult = {
  ok: boolean;
  /** invitation = correo para confirmar; pass = pase con QR (invitado + acompañantes). */
  kind: "invitation" | "pass";
  sent: { email: string; name?: string }[];
  failed: { email: string; name?: string; error: string }[];
  /** Solo en kind=pass: WhatsApp por persona (error vacío = salió). */
  whatsapp?: { name?: string; phone?: string; error?: string }[];
};

/** Solo WhatsApp del pase: invitado + acompañantes (fila de acompañante: solo él). */
export const whatsappInvitation = async (ticketId: string): Promise<{ whatsapp: NonNullable<ResendResult["whatsapp"]> }> => {
  const { data } = await apiClient.post(`/ticket/tickets/invitations/${encodeURIComponent(ticketId)}/whatsapp`, {}, { withCredentials: true });
  return data;
};

export const resendInvitation = async (ticketId: string): Promise<ResendResult> => {
  const { data } = await apiClient.post(`/ticket/tickets/invitations/${encodeURIComponent(ticketId)}/resend`, {}, { withCredentials: true });
  return data;
};

/** Recordatorio a todos los que no han confirmado. Se envía en segundo plano. */
export const resendPendingInvitations = async (eventId: string) => {
  const { data } = await apiClient.post<{ ok: boolean; total: number }>(
    "/ticket/tickets/invitations/resend-pending",
    { eventId },
    { withCredentials: true },
  );
  return data;
};

/** Correo "agregue a su acompañante" a quien confirmó sin nombrarlo. */
export const requestCompanion = async (ticketId: string) => {
  await apiClient.post(`/ticket/tickets/invitations/${encodeURIComponent(ticketId)}/companion-request`, {}, { withCredentials: true });
};
