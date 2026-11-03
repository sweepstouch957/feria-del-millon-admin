// Comparar la feria de este año con las anteriores. Sin React: se prueba con fairHistory.check.ts.
// Los años viejos vienen de fairHistory.json (scripts/legacy-fair-history.mjs en el back).

export type YearRow = {
  year: string;
  artworksSold: number;
  artworkRevenue: number;
  buyers: number;
  applications: number;
  accepted: number;
  paidApplications: number;
  applicationRevenue: number;
  /** Solo 2026: en la plataforma anterior las entradas no se vendían aquí. */
  ticketRevenue?: number;
  current?: boolean;
};

export type Metric = { key: keyof YearRow; label: string; money?: boolean };

export const METRICS: Metric[] = [
  { key: "artworkRevenue", label: "Ventas de obras", money: true },
  { key: "artworksSold", label: "Obras vendidas" },
  { key: "buyers", label: "Compradores" },
  { key: "applications", label: "Postulaciones" },
  { key: "accepted", label: "Seleccionados" },
  { key: "applicationRevenue", label: "Inscripciones cobradas", money: true },
];

/** Año con la cifra más alta de cada métrica (empate: el más reciente). */
export function bestByMetric(rows: YearRow[]): Partial<Record<keyof YearRow, string>> {
  const out: Partial<Record<keyof YearRow, string>> = {};
  for (const m of METRICS) {
    let best: YearRow | undefined;
    for (const r of rows) {
      const v = Number(r[m.key]) || 0;
      if (v > 0 && (!best || v >= (Number(best[m.key]) || 0))) best = r;
    }
    if (best) out[m.key] = best.year;
  }
  return out;
}

/** Puesto de un año en una métrica: 1 = el mejor. */
export function rankOf(rows: YearRow[], year: string, key: keyof YearRow): number {
  const mine = Number(rows.find((r) => r.year === year)?.[key]) || 0;
  return 1 + rows.filter((r) => r.year !== year && (Number(r[key]) || 0) > mine).length;
}

/** Fila de este año a partir de lo que ya calcula useIncome. */
export function currentYearRow(
  year: string,
  {
    orders,
    ordersTotal,
    appsTotal,
    apps,
    applications,
    ticketsTotal,
  }: {
    orders: { items?: { qty?: number }[]; buyer?: { email?: string } }[];
    ordersTotal: number;
    appsTotal: number;
    apps: unknown[];
    applications: { total: number; accepted: number };
    ticketsTotal: number;
  },
): YearRow {
  return {
    year,
    current: true,
    artworksSold: orders.reduce((s, o) => s + (o.items ?? []).reduce((n, i) => n + (Number(i.qty) || 1), 0), 0),
    artworkRevenue: ordersTotal,
    buyers: new Set(orders.map((o) => String(o.buyer?.email ?? "").trim().toLowerCase()).filter(Boolean)).size,
    applications: applications.total,
    accepted: applications.accepted,
    paidApplications: apps.length,
    applicationRevenue: appsTotal,
    ticketRevenue: ticketsTotal,
  };
}
