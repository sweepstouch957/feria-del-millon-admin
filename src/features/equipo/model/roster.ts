// Lista pegada (Excel, WhatsApp, correo) → personas para crear cuentas.
// Cada línea: nombre y correo, separados por tab, coma, punto y coma o espacios.

import type { Roles } from "@services/user.service";

export type StaffRole = "cajera" | "coordinadora" | "taquilla";

export const STAFF_ROLES: { value: StaffRole; label: string; hint: string; roles: Roles }[] = [
  { value: "cajera", label: "Cajera", hint: "Vende obras, cierra su caja y valida entradas", roles: { cajero: true } },
  {
    value: "coordinadora",
    label: "Cajera coordinadora",
    hint: "Lo de la cajera + aparta con abono y cobra cartera",
    roles: { cajero: true, jefeCaja: true },
  },
  { value: "taquilla", label: "Taquilla", hint: "Vende boletas y valida entradas", roles: { taquilla: true } },
];

export const rolesFor = (r: StaffRole): Roles => STAFF_ROLES.find((x) => x.value === r)!.roles;

export type RosterRow = { firstName: string; lastName: string; email: string };

const EMAIL = /[^\s,;<>"']+@[^\s,;<>"']+\.[a-z]{2,}/i;

/** Nombre completo → nombre(s) y apellidos. Con 4 palabras o más, las dos primeras son el nombre. */
export function splitName(full: string): { firstName: string; lastName: string } {
  const w = full.trim().split(/\s+/).filter(Boolean);
  const cut = w.length >= 4 ? 2 : 1;
  return { firstName: w.slice(0, cut).join(" "), lastName: w.slice(cut).join(" ") };
}

export type Credential = { email: string; password: string };

/**
 * Lista de credenciales ya creadas (tabla pegada, Excel): en cada línea, la clave
 * es lo que sigue al correo. Líneas sin correo (saludo, encabezado) se ignoran;
 * con correo pero sin clave van a `skipped`.
 */
export function parseCredentials(text: string): { rows: Credential[]; skipped: string[] } {
  const rows: Credential[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const parts = line.split(/[\s|`,;]+/).filter(Boolean);
    const i = parts.findIndex((p) => EMAIL.test(p));
    if (i < 0) continue;
    const email = parts[i].toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    if (parts[i + 1]) rows.push({ email, password: parts[i + 1] });
    else skipped.push(email);
  }
  return { rows, skipped };
}

/** Una persona por línea con correo; repetidos y líneas sin correo se descartan. */
export function parseRoster(text: string): { rows: RosterRow[]; skipped: string[] } {
  const rows: RosterRow[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const m = line.match(EMAIL);
    if (!m) {
      skipped.push(line.trim());
      continue;
    }
    const email = m[0].toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    const name = line.replace(m[0], " ").replace(/[\t,;<>"]+/g, " ").trim();
    rows.push({ ...splitName(name), email });
  }
  return { rows, skipped };
}
