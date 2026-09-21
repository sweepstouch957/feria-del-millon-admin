// utils/csv.ts — CSV que Excel abre bien: ";" como separador (Excel en
// español), BOM UTF-8 para tildes/ñ y CRLF. Las columnas marcadas como texto
// (teléfonos, documentos) van como ="..." para no perder ceros ni salir en
// notación científica.
export { downloadCsv } from "./exportApplications";

export type CsvCol<T> = {
  header: string;
  value: (row: T) => unknown;
  /** Forzar texto en Excel (teléfonos, cédulas). */
  text?: boolean;
};

const field = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const asText = (v: unknown) => {
  const s = v == null ? "" : String(v).trim();
  return s ? `="${s.replace(/"/g, '""')}"` : "";
};

export function toCsv<T>(rows: T[], cols: CsvCol<T>[]): string {
  const lines = [
    cols.map((c) => field(c.header)).join(";"),
    ...rows.map((r) => cols.map((c) => (c.text ? asText(c.value(r)) : field(c.value(r)))).join(";")),
  ];
  return "﻿" + lines.join("\r\n");
}

export const fmtDay = (iso?: string | Date | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("es-CO");
};

export const stamp = () => new Date().toISOString().slice(0, 10);
