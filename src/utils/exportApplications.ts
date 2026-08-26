/* utils/exportApplications.ts
 * Exporta inscritos (postulaciones) a un archivo abrible en Excel, sin
 * dependencias externas: CSV con BOM UTF-8 y delimitador ";" (el que Excel
 * en español/es-CO usa por defecto → abre directo en columnas, sin warnings).
 */
import { listApplications, type ArtistApplication } from "@services/applications.service";
import { formatDate } from "@/utils/date";

export type Segment = "paid_submitted" | "paid_not_submitted" | "not_paid" | "all";

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pago pendiente",
  draft: "Borrador",
  submitted: "Enviada",
  under_review: "En revisión",
  revision_requested: "Corrección solicitada",
  accepted: "Aceptada",
  rejected: "Rechazada",
};

/** "Envió propuesta" = tiene submittedAt, o su estado ya pasó de borrador. */
export function isSubmitted(a: ArtistApplication): boolean {
  if (a.submittedAt) return true;
  return ["submitted", "under_review", "revision_requested", "accepted", "rejected"].includes(a.status);
}

export function inSegment(a: ArtistApplication, seg: Segment): boolean {
  switch (seg) {
    case "paid_submitted":
      return !!a.isPaid && isSubmitted(a);
    case "paid_not_submitted":
      return !!a.isPaid && !isSubmitted(a);
    case "not_paid":
      return !a.isPaid;
    case "all":
      return true;
  }
}

export function countSegments(apps: ArtistApplication[]): Record<Segment, number> {
  return {
    paid_submitted: apps.filter((a) => inSegment(a, "paid_submitted")).length,
    paid_not_submitted: apps.filter((a) => inSegment(a, "paid_not_submitted")).length,
    not_paid: apps.filter((a) => inSegment(a, "not_paid")).length,
    all: apps.length,
  };
}

/** Trae TODAS las postulaciones paginando el endpoint (que viene paginado). */
export async function fetchAllApplications(): Promise<ArtistApplication[]> {
  const all: ArtistApplication[] = [];
  const limit = 200;
  let page = 1;
  // tope de seguridad para no ciclar infinito
  for (let guard = 0; guard < 200; guard++) {
    const res = await listApplications({ page, limit });
    const docs = res.docs || [];
    all.push(...docs);
    if (docs.length === 0 || all.length >= (res.total || all.length)) break;
    page += 1;
  }
  return all;
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return formatDate(d, { year: "numeric", month: "2-digit", day: "2-digit" });
}

// Escapa un campo para CSV: envuelve en comillas si contiene ; " o salto de línea.
function csvField(v: string): string {
  const s = String(v ?? "");
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Fuerza a Excel a tratar el valor como TEXTO (no como número → evita que un
// teléfono largo salga en notación científica "5.73E+11" o pierda ceros a la
// izquierda). Excel evalúa `="573..."` como cadena literal.
function asExcelText(v: string): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return `="${s.replace(/"/g, '""')}"`;
}

const HEADERS = [
  "Nombre",
  "Apellido",
  "Email",
  "Teléfono",
  "Ciudad",
  "Convocatoria",
  "Estado",
  "Pagó",
  "Fecha de pago",
  "Envió propuesta",
  "Fecha de envío",
  "Obras cargadas",
  "Fecha de registro",
];

export function applicationsToCsv(apps: ArtistApplication[]): string {
  const rows = apps.map((a) => {
    const artist = (typeof a.artist === "object" && a.artist) || ({} as any);
    const conv = (typeof a.convocatoria === "object" && a.convocatoria) || ({} as any);
    return [
      artist.firstName || "",
      artist.lastName || "",
      artist.email || "",
      asExcelText(artist.mobile || ""), // texto → sin notación científica
      artist.city || "",
      conv.name || "",
      STATUS_LABEL[a.status] || a.status || "",
      a.isPaid ? "Sí" : "No",
      fmtDate(a.paidAt),
      isSubmitted(a) ? "Sí" : "No",
      fmtDate(a.submittedAt),
      String(a.artworkImages?.length || 0),
      fmtDate(a.createdAt),
    ];
  });

  const sep = ";";
  const lines = [HEADERS, ...rows].map((r) => r.map(csvField).join(sep));
  // BOM (UTF-8) para que Excel respete tildes/ñ + CRLF entre filas.
  return "﻿" + lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
