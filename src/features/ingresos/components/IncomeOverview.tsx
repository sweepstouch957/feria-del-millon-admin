"use client";

import * as React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { useQuery } from "@tanstack/react-query";
import { eyebrow } from "@/app/theme";
import { getSalesReport, type OrderDoc } from "@services/orders.service";
import type { TicketSale } from "@services/ticket.service";
import { formatCOP } from "@/utils/money";
import { SALES_DETAIL_ENABLED } from "@/utils/exportsLock";
import history from "../model/fairHistory.json";
import { yearIncome, type YearRow } from "../model/fairHistory";
import { dayOf, methodMatrix, orderPayments } from "../model/income";
import { MeterList, Panel } from "./DashboardCharts";

/* Panorama de Reportes: cómo va la feria de un vistazo. Todo sale de los mismos
   datos del detalle (useIncome) más el informe de ventas de obras, que ya trae
   pabellón, artista y técnica. Colores: los de fuente del Tablero (obras ámbar,
   boletos azul) y CHART_COLORS para comparar días. */

const SOURCE = {
  light: { orders: "#C9902B", tickets: "#4C78C8" },
  dark: { orders: "#B07F20", tickets: "#5C8FE6" },
} as const;
// Días de feria (orden fijo, hasta 4). Validados con validate_palette.js en cada
// modo: ámbar no queda junto a terracota. Su contraste en claro es bajo, por eso
// la leyenda escribe el total de cada día.
const DAYS = {
  light: ["#2F8F5B", "#C9902B", "#5B5FC7", "#B4472A"],
  dark: ["#3FA46E", "#B8862A", "#7C80E6", "#D4674A"],
} as const;

const money = (n: number) => formatCOP(n);
const compact = (n: number) =>
  n >= 1e9 ? `$${(n / 1e9).toLocaleString("es-CO", { maximumFractionDigits: 2 })} mil M`
  : n >= 1e6 ? `$${(n / 1e6).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`
  : n >= 1e3 ? `$${Math.round(n / 1e3)} mil` : `$${n}`;
const pct = (n: number) => `${(n * 100).toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;
const dayShort = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", timeZone: "UTC" }).replace(".", "");
const hourOf = (at?: string) =>
  at ? Number(new Date(at).toLocaleString("en-US", { timeZone: "America/Bogota", hour: "numeric", hour12: false })) % 24 : -1;

const LAST_YEAR = (history.years as unknown as YearRow[]).find((y) => y.year === String(new Date().getFullYear() - 1));

type Pay = { at?: string; amount: number };

export default function IncomeOverview({ eventId, tickets, orders, appsTotal, dayF, loading }: {
  eventId: string; tickets: TicketSale[]; orders: OrderDoc[]; appsTotal: number; dayF: string; loading: boolean;
}) {
  const mode = useTheme().palette.mode;
  const src = SOURCE[mode];
  const dayColors = DAYS[mode];
  const today = dayOf(new Date());
  const sales = useQuery({
    queryKey: ["reports", "sales", { event: eventId, from: dayF, to: dayF }],
    queryFn: () => getSalesReport(dayF ? { event: eventId, from: dayF, to: dayF } : { event: eventId }),
    staleTime: 60_000,
  });

  // Cada peso con su hora: abonos de apartadas cuentan el día que entraron.
  const orderPays: Pay[] = React.useMemo(() => orders.flatMap((o) => orderPayments(o)), [orders]);
  const ticketPays: Pay[] = React.useMemo(() => tickets.map((t) => ({ at: t.createdAt, amount: Number(t.price || 0) })), [tickets]);

  // ── Por día: obras y boletos (las inscripciones se pagan meses antes, no van aquí).
  const byDay = React.useMemo(() => {
    const m = new Map<string, { orders: number; tickets: number }>();
    const add = (p: Pay, k: "orders" | "tickets") => {
      const d = dayOf(p.at); if (!d || !p.amount) return;
      const r = m.get(d) || { orders: 0, tickets: 0 }; r[k] += p.amount; m.set(d, r);
    };
    orderPays.forEach((p) => add(p, "orders"));
    ticketPays.forEach((p) => add(p, "tickets"));
    // Días de feria: los que movieron al menos el 3 % del mejor día (fuera la preventa suelta).
    const rows = [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
    const best = Math.max(0, ...rows.map(([, r]) => r.orders + r.tickets));
    return rows.filter(([, r]) => r.orders + r.tickets >= best * 0.03).slice(-10).map(([day, r]) => ({ day, ...r }));
  }, [orderPays, ticketPays]);

  // ── Ritmo por hora: obras acumuladas en cada día de feria, para comparar "a esta hora".
  const pace = React.useMemo(() => {
    const days = byDay.filter((d) => d.orders > 0).slice(-4).map((d) => d.day);
    const hourly = new Map<string, number[]>(days.map((d) => [d, Array(24).fill(0)]));
    for (const p of orderPays) { const h = hourly.get(dayOf(p.at)); const hr = hourOf(p.at); if (h && hr >= 0) h[hr] += p.amount; }
    const used = days.flatMap((d) => hourly.get(d)!.map((v, i) => (v ? i : -1))).filter((i) => i >= 0);
    if (!used.length) return null;
    const hours = Array.from({ length: Math.max(...used) - Math.min(...used) + 1 }, (_, i) => Math.min(...used) + i);
    const nowH = hourOf(new Date().toISOString());
    const series = days.map((d) => {
      let acc = 0;
      const per = hourly.get(d)!;
      for (let i = 0; i < hours[0]; i++) acc += per[i];
      return { day: d, data: hours.map((h) => (d === today && h > nowH ? null : (acc += per[h]))) };
    });
    // Hoy contra ayer a la misma hora.
    const t = series.find((s) => s.day === today);
    const y = series.length > 1 ? series[series.indexOf(t!) - 1] : undefined;
    const idx = hours.indexOf(Math.min(Math.max(nowH, hours[0]), hours[hours.length - 1]));
    const vs = t && y && idx >= 0 ? { today: t.data[idx] || 0, yesterday: y.data[idx] || 0, yDay: y.day, hour: hours[idx] } : null;
    return { hours, series, vs };
  }, [byDay, orderPays, today]);

  const ordersTotal = orderPays.filter((p) => !dayF || dayOf(p.at) === dayF).reduce((s, p) => s + p.amount, 0);
  const ticketsTotal = ticketPays.filter((p) => !dayF || dayOf(p.at) === dayF).reduce((s, p) => s + p.amount, 0);
  const methods = methodMatrix(dayF ? tickets.filter((t) => dayOf(t.createdAt) === dayF) : tickets, orders, [], dayF).filter((r) => r.tickets + r.orders > 0);
  const methodsTotal = methods.reduce((s, r) => s + r.tickets + r.orders, 0);
  const rep = sales.data;
  const share = (rows: { label: string; amount: number; units: number }[] | undefined, top: number) => {
    const all = rows || [];
    const total = all.reduce((s, r) => s + r.amount, 0);
    return all.slice(0, top).map((r) => ({ label: `${r.label} · ${r.units} obra${r.units === 1 ? "" : "s"}`, value: r.amount, of: total, text: compact(r.amount) }));
  };

  // Bloqueo (utils/exportsLock): solo el reparto por pabellón, sin enlaces al detalle.
  if (!SALES_DETAIL_ENABLED) {
    return (
      <Box sx={{ mb: 3 }}>
        <Panel title="Obras por pabellón" sub={`Obras pagadas${rep ? ` · ${compact(rep.total)} en ${rep.units} obras` : ""}`} loading={sales.isLoading}>
          <MeterList rows={share(rep?.byPavilion, 12)} empty="Sin ventas por pabellón todavía." />
        </Panel>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" }, mb: 3 }}>
      {/* Meta del año: solo con la feria completa (sin filtro de día). */}
      {!dayF && LAST_YEAR && (
        <Box sx={{ gridColumn: "1 / -1" }}>
          <Goal loading={loading} ordersNow={ordersTotal} ordersLast={LAST_YEAR.artworkRevenue}
            totalNow={ordersTotal + ticketsTotal + appsTotal} totalLast={yearIncome(LAST_YEAR)} year={LAST_YEAR.year} />
        </Box>
      )}

      <Panel title="Ingresos por día" sub="Obras y boletos de cada día de feria (hora Colombia)" loading={loading}>
        {byDay.length ? (
          <>
            <Legend items={[{ color: src.orders, label: "Obras" }, { color: src.tickets, label: "Boletos" }]} />
            <BarChart
              height={280}
              hideLegend
              borderRadius={3}
              grid={{ horizontal: true }}
              margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
              xAxis={[{ scaleType: "band", data: byDay.map((d) => dayShort(d.day)), categoryGapRatio: 0.5, disableLine: true, disableTicks: true }]}
              yAxis={[{ valueFormatter: compact, disableLine: true, disableTicks: true, width: 60 }]}
              series={[
                { data: byDay.map((d) => d.orders), label: "Obras", color: src.orders, stack: "d", valueFormatter: (v) => (v ? money(v) : null) },
                { data: byDay.map((d) => d.tickets), label: "Boletos", color: src.tickets, stack: "d", valueFormatter: (v) => (v ? money(v) : null) },
              ]}
            />
          </>
        ) : <Empty />}
      </Panel>

      <Panel title="Cómo pagan" sub={dayF ? "Obras y boletos de este día" : "Obras y boletos, toda la feria"} loading={loading}>
        <MeterList rows={methods.map((r) => ({ label: r.label, value: r.tickets + r.orders, of: methodsTotal, text: compact(r.tickets + r.orders) }))} />
      </Panel>

      {pace && (
        <Box sx={{ gridColumn: "1 / -1" }}>
          <Panel title="Ritmo de venta de obras" sub="Acumulado por hora en cada día: muestra si hoy va mejor o peor que los días anteriores a la misma hora" loading={loading}>
            {pace.vs && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                A las {pace.vs.hour}:00 hoy van <b>{compact(pace.vs.today)}</b> en obras;
                {" "}el {dayShort(pace.vs.yDay)} a esa hora iban {compact(pace.vs.yesterday)}
                {pace.vs.yesterday > 0 && (
                  <Box component="span" sx={{ ml: 0.75, color: pace.vs.today >= pace.vs.yesterday ? "success.main" : "error.main", fontWeight: 500 }}>
                    ({pace.vs.today >= pace.vs.yesterday ? "+" : ""}{pct(pace.vs.today / pace.vs.yesterday - 1)})
                  </Box>
                )}
              </Typography>
            )}
            <Legend items={pace.series.map((s, i) => {
              const last = [...s.data].reverse().find((v) => v != null) ?? 0;
              return { color: dayColors[i], label: `${dayShort(s.day)}${s.day === today ? " (hoy)" : ""} · ${compact(last)}`, strong: s.day === today };
            })} />
            <LineChart
              height={300}
              hideLegend
              grid={{ horizontal: true }}
              margin={{ left: 0, right: 12, top: 8, bottom: 0 }}
              xAxis={[{ scaleType: "point", data: pace.hours, valueFormatter: (h: number) => `${h}:00`, disableLine: true, disableTicks: true }]}
              yAxis={[{ valueFormatter: compact, disableLine: true, disableTicks: true, width: 60 }]}
              series={pace.series.map((s, i) => ({
                id: `d${s.day}`, data: s.data, label: dayShort(s.day), color: dayColors[i], curve: "monotoneX" as const, showMark: false,
                valueFormatter: (v: number | null) => (v == null ? null : money(v)),
              }))}
              sx={{
                "& .MuiLineElement-root": { strokeWidth: 2 },
                [`& .MuiLineElement-series-d${today}`]: { strokeWidth: 3.5 },
              }}
            />
          </Panel>
        </Box>
      )}

      <Panel title="Obras por pabellón" sub={`Obras pagadas${rep ? ` · ${compact(rep.total)} en ${rep.units} obras` : ""}`} href="/reportes/ventas" linkLabel="Ver informe" loading={sales.isLoading}>
        <MeterList rows={share(rep?.byPavilion, 12)} empty="Sin ventas por pabellón todavía." />
      </Panel>

      <Panel title="Técnicas que más venden" loading={sales.isLoading}>
        <MeterList rows={share(rep?.byTechnique, 8)} />
      </Panel>

      <Box sx={{ gridColumn: "1 / -1" }}>
        <Panel title="Artistas con más ventas" sub="Diez primeros, por valor vendido" href="/reportes/ventas" linkLabel="Ver todos" loading={sales.isLoading}>
          {(() => {
            const top = share(rep?.byArtist, 10);
            if (!top.length) return <MeterList rows={[]} />;
            return (
              <Box sx={{ display: "grid", gap: { xs: 1.5, md: 4 }, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
                <MeterList rows={top.slice(0, 5)} />
                {top.length > 5 && <MeterList rows={top.slice(5)} />}
              </Box>
            );
          })()}
        </Panel>
      </Box>
    </Box>
  );
}

/** Cuánto falta para pasar el año anterior: en obras y en total. */
function Goal({ loading, ordersNow, ordersLast, totalNow, totalLast, year }: {
  loading: boolean; ordersNow: number; ordersLast: number; totalNow: number; totalLast: number; year: string;
}) {
  const rows = [
    { label: "Obras", now: ordersNow, last: ordersLast },
    { label: "Total (obras + boletos + inscripciones)", now: totalNow, last: totalLast },
  ];
  return (
    <Panel title={`Contra la feria ${year}`} sub={`Lo vendido hasta ahora frente a todo ${year}`} href="/reportes/historico" linkLabel="Ver histórico" loading={loading}>
      <Box sx={{ display: "grid", gap: { xs: 2.5, md: 4 }, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        {rows.map((r) => {
          const p = r.last ? r.now / r.last : 0;
          const left = r.last - r.now;
          return (
            <Box key={r.label}>
              <Typography sx={{ ...eyebrow, fontSize: 9.5, color: "text.secondary" }}>{r.label}</Typography>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, flexWrap: "wrap", my: 0.5 }}>
                <Typography sx={{ fontWeight: 200, fontSize: "clamp(30px, 3.4vw, 44px)", lineHeight: 1.05, color: p >= 1 ? "primary.main" : "text.primary", fontVariantNumeric: "tabular-nums" }}>
                  {pct(p)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {left > 0 ? <>faltan <Box component="span" sx={{ color: "text.primary" }}>{money(left)}</Box></> : <>superado por {money(-left)}</>}
                </Typography>
              </Box>
              <Box role="meter" aria-label={r.label} aria-valuemin={0} aria-valuemax={r.last} aria-valuenow={r.now} sx={{ position: "relative", height: 10, backgroundColor: "divider" }}>
                <Box sx={{ height: "100%", width: `${Math.min(p, 1) * 100}%`, backgroundColor: "primary.main", transition: "width .6s ease" }} />
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.75 }}>
                <Typography variant="caption" color="text.secondary">{compact(r.now)} hoy</Typography>
                <Typography variant="caption" color="text.secondary">{compact(r.last)} en {year}</Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Panel>
  );
}

function Legend({ items }: { items: { color: string; label: string; strong?: boolean }[] }) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.5, mb: 1 }}>
      {items.map((it) => (
        <Box key={it.label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: "2px", backgroundColor: it.color }} />
          <Typography variant="caption" sx={{ textTransform: "capitalize", color: it.strong ? "text.primary" : "text.secondary", fontWeight: it.strong ? 500 : 400 }}>{it.label}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function Empty() {
  return <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>Sin datos todavía.</Typography>;
}
