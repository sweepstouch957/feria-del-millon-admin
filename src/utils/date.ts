// src/utils/date.ts — fecha localizada es-CO con guard de valor vacío/ inválido.
// Reemplaza los `x ? new Date(x).toLocaleDateString("es-CO", …) : "—"` repetidos.

export function formatDate(
  value?: string | number | Date | null,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (value == null || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", opts);
}
