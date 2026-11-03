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
  ticketsSold?: number;
  current?: boolean;
  // Solo años anteriores (fairHistory.json):
  rejectedSales?: number;
  rejectedValue?: number;
  newBuyers?: number;
  returningBuyers?: number;
  worksOffered?: number;
  copiesOffered?: number;
  sellingArtists?: number;
  newUsers?: number;
  methods?: Partial<Record<string, number>>;
};

/** Una convocatoria, salón o pabellón de la plataforma anterior. */
export type FairRow = {
  name: string;
  year: string | null;
  status: string;
  fee: number;
  applications: number;
  accepted: number;
  paidApplications: number;
  applicationRevenue: number;
  worksOffered: number;
  salesMatched: number;
  salesMatchedValue: number;
};

/** Plata total de un año: obras + inscripciones + boletos. */
export const yearIncome = (r: YearRow) => r.artworkRevenue + r.applicationRevenue + (r.ticketRevenue ?? 0);

/** Totales de todos los años. Compradores únicos = suma de los que compraron por primera vez. */
export function historyTotals(rows: YearRow[]) {
  const sum = (k: keyof YearRow) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  return {
    income: rows.reduce((s, r) => s + yearIncome(r), 0),
    artworkRevenue: sum("artworkRevenue"),
    artworksSold: sum("artworksSold"),
    uniqueBuyers: sum("newBuyers"),
    applications: sum("applications"),
    accepted: sum("accepted"),
    applicationRevenue: sum("applicationRevenue"),
    paidApplications: sum("paidApplications"),
  };
}

/**
 * "¿Y si vendemos todo?": lo cobrado hasta hoy más lo que daría vender todo lo
 * que queda. `stockValue` = precio × copias disponibles; `ticketsLeft` = cupo
 * libre de cada día × su precio (escenario de lleno total, sin invitaciones).
 */
export function fullSaleProjection({
  collected,
  stockValue,
  ticketsLeft,
}: {
  collected: { artworks: number; applications: number; tickets: number };
  stockValue: number;
  ticketsLeft: number;
}) {
  const today = collected.artworks + collected.applications + collected.tickets;
  return {
    today,
    ifArtworksSell: today + stockValue,
    ifEverythingSells: today + stockValue + ticketsLeft,
  };
}

/** Métodos de pago en el orden de lo que más movió en toda la historia. */
export function methodColumns(rows: YearRow[]): string[] {
  const total = new Map<string, number>();
  for (const r of rows) for (const [m, v] of Object.entries(r.methods ?? {})) total.set(m, (total.get(m) ?? 0) + (v ?? 0));
  return [...total.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
}

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
    tickets,
  }: {
    orders: { items?: { qty?: number }[]; buyer?: { email?: string } }[];
    ordersTotal: number;
    appsTotal: number;
    apps: unknown[];
    applications: { total: number; accepted: number };
    ticketsTotal: number;
    tickets?: unknown[];
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
    ticketsSold: tickets?.length ?? 0,
  };
}
