// src/utils/money.ts — formateo de moneda COP (única fuente de verdad).
// Reemplaza las ~13 copias sueltas de Intl.NumberFormat("es-CO", ...) del admin.

// Siempre con el código ("COP 1.300.000"), nunca "$": el signo solo se
// confunde con dólares (compradores extranjeros, feria de NY). `code` queda por
// compatibilidad con las llamadas viejas.
export function formatCOP(
  amount?: number | null,
  opts?: { code?: boolean; currency?: string }
): string {
  const currency = opts?.currency || "COP";
  const n = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString("es-CO")}`;
  }
}
