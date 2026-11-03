"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Alert, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import ReportTabs from "@/components/ui/ReportTabs";
import { eyebrow } from "@/app/theme";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { formatCOP } from "@/utils/money";
import { useIncome } from "../hooks/useIncome";
import { FullSaleDialog } from "./FullSaleDialog";
import {
  bestByMetric,
  currentYearRow,
  historyTotals,
  methodColumns,
  METRICS,
  rankOf,
  yearIncome,
  type FairRow,
  type YearRow,
} from "../model/fairHistory";
import history from "../model/fairHistory.json";

const money = (v: number) => formatCOP(v || 0, { code: true });
const count = (v: number) => (v || 0).toLocaleString("es-CO");
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)} %` : "—");

/** Columna de una tabla por año. `value` sin dato (año en curso) se muestra como "—". */
type Col = { label: string; value: (r: YearRow) => number | string | undefined; money?: boolean; best?: keyof YearRow };

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <Box component="section" sx={{ mt: { xs: 3, md: 4 } }}>
      <Typography component="h2" sx={{ fontSize: 17, mb: 0.5 }}>{title}</Typography>
      {sub && <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, maxWidth: 820 }}>{sub}</Typography>}
      {children}
    </Box>
  );
}

function YearTable({ rows, cols, best, loading }: { rows: YearRow[]; cols: Col[]; best: Partial<Record<keyof YearRow, string>>; loading: boolean }) {
  return (
    <TableContainer sx={{ border: "1px solid", borderColor: "divider" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell component="th" scope="col">Año</TableCell>
            {cols.map((c) => <TableCell key={c.label} align="right" sx={{ whiteSpace: "nowrap" }}>{c.label}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.year} sx={r.current ? { bgcolor: "action.hover" } : undefined}>
              <TableCell component="th" scope="row" sx={{ whiteSpace: "nowrap", fontWeight: r.current ? 600 : 400 }}>
                {r.year}
                {r.current && <Typography component="span" sx={{ ...eyebrow, fontSize: 9, ml: 1, color: "primary.main" }}>En curso</Typography>}
              </TableCell>
              {cols.map((c) => {
                const v = c.value(r);
                const top = !!c.best && best[c.best] === r.year;
                return (
                  <TableCell
                    key={c.label}
                    align="right"
                    sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: top ? "primary.main" : undefined, fontWeight: top ? 600 : undefined }}
                  >
                    {loading && r.current ? "…" : v === undefined ? "—" : typeof v === "string" ? v : c.money ? money(v) : count(v)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function FairHistoryPage() {
  const { event, eventId, isLoading, isError, refetch } = useActiveEvent();
  if (!eventId) return <ActiveEventGate isLoading={isLoading} isError={isError} onRetry={refetch} />;
  const start = (event as { validFrom?: string } | undefined)?.validFrom;
  const year = String(start ? new Date(start).getFullYear() : new Date().getFullYear());
  return <FairHistory eventId={eventId} year={year} />;
}

/** ¿Es esta la mejor feria? Este año en vivo contra los años de la plataforma anterior. */
function FairHistory({ eventId, year }: { eventId: string; year: string }) {
  const income = useIncome(eventId);
  const [q, setQ] = useState("");
  const [projectionOpen, setProjectionOpen] = useState(false);
  const current = currentYearRow(year, income);
  // El año en curso sale de esta plataforma; lo que la anterior tenga de ese año se descarta.
  const past = (history.years as YearRow[]).filter((r) => r.year !== year);
  const rows = [current, ...[...past].reverse()];
  const best = bestByMetric(rows);
  const totals = historyTotals(rows);
  const methods = methodColumns(past);

  const fairs = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (history.fairs as FairRow[])
      .filter((f) => !/prueba/i.test(f.name)) // convocatorias de prueba del sistema viejo
      .filter((f) => !needle || f.name.toLowerCase().includes(needle) || String(f.year).includes(needle));
  }, [q]);

  const salesCols: Col[] = [
    { label: "Ventas de obras", value: (r) => r.artworkRevenue, money: true, best: "artworkRevenue" },
    { label: "Obras vendidas", value: (r) => r.artworksSold, best: "artworksSold" },
    { label: "Promedio por obra", value: (r) => (r.artworksSold ? Math.round(r.artworkRevenue / r.artworksSold) : 0), money: true },
    { label: "Compradores", value: (r) => r.buyers, best: "buyers" },
    { label: "Nuevos", value: (r) => r.newBuyers },
    { label: "Recurrentes", value: (r) => r.returningBuyers },
    { label: "Pagos rechazados", value: (r) => r.rejectedSales },
    { label: "Valor rechazado", value: (r) => r.rejectedValue, money: true },
  ];
  const callCols: Col[] = [
    { label: "Postulaciones", value: (r) => r.applications, best: "applications" },
    { label: "Seleccionados", value: (r) => r.accepted, best: "accepted" },
    { label: "% seleccionados", value: (r) => pct(r.accepted, r.applications) },
    { label: "Inscripciones pagadas", value: (r) => r.paidApplications },
    { label: "Inscripciones cobradas", value: (r) => r.applicationRevenue, money: true, best: "applicationRevenue" },
    { label: "Obras ofrecidas", value: (r) => r.worksOffered },
    { label: "Artistas con obras", value: (r) => r.sellingArtists },
    { label: "Usuarios nuevos", value: (r) => r.newUsers },
  ];
  const incomeCols: Col[] = [
    { label: "Ingresos totales", value: yearIncome, money: true },
    { label: "Obras", value: (r) => r.artworkRevenue, money: true },
    { label: "Inscripciones", value: (r) => r.applicationRevenue, money: true },
    { label: "Boletos", value: (r) => (r.current ? r.ticketRevenue : undefined), money: true },
  ];
  const methodCols: Col[] = methods.map((m) => ({ label: m, value: (r) => (r.current ? undefined : r.methods?.[m] ?? 0), money: true }));

  return (
    <Box>
      <PageHeader
        crumb="Reportes"
        title="Ferias anteriores"
        description={`La feria ${year} contra cada año desde 2017. La cifra más alta de cada columna sale en verde.`}
        actions={[{ label: `¿Y si vendemos todo en ${year}?`, kind: "pri", onClick: () => setProjectionOpen(true) }]}
      />
      <FullSaleDialog
        open={projectionOpen}
        onClose={() => setProjectionOpen(false)}
        eventId={eventId}
        year={year}
        collected={{ artworks: income.ordersTotal, applications: income.appsTotal, tickets: income.ticketsTotal }}
      />
      <ReportTabs />
      {income.failed && <Alert severity="error" sx={{ mb: 2 }}>Una parte de las cifras de {year} no cargó. Vuelve a abrir la página.</Alert>}

      <KpiStrip
        loading={income.loading}
        items={METRICS.slice(0, 4).map((m) => ({
          label: `${m.label} ${year}`,
          value: m.money ? money(Number(current[m.key])) : count(Number(current[m.key])),
          sub: `Puesto ${rankOf(rows, year, m.key)} de ${rows.length}${best[m.key] === year ? " · el mejor año" : ""}`,
        }))}
      />

      <Section title="Desde 2017" sub="Todo lo registrado en las dos plataformas, sumando todos los años.">
        <KpiStrip
          loading={income.loading}
          items={[
            { label: "Ingresos", value: money(totals.income), accent: true, sub: "obras + inscripciones + boletos" },
            { label: "Ventas de obras", value: money(totals.artworkRevenue), sub: `${count(totals.artworksSold)} obras` },
            { label: "Compradores distintos", value: count(totals.uniqueBuyers), sub: "hasta 2025" },
            { label: "Postulaciones", value: count(totals.applications), sub: `${count(totals.accepted)} seleccionados` },
            { label: "Inscripciones cobradas", value: money(totals.applicationRevenue), sub: `${count(totals.paidApplications)} pagadas` },
          ]}
        />
      </Section>

      <Section title="Ingresos por año">
        <YearTable rows={rows} cols={incomeCols} best={best} loading={income.loading} />
      </Section>

      <Section
        title="Ventas de obras"
        sub="Nuevos = compraron por primera vez ese año. Recurrentes = ya habían comprado en un año anterior."
      >
        <YearTable rows={rows} cols={salesCols} best={best} loading={income.loading} />
      </Section>

      <Section title="Convocatorias y artistas">
        <YearTable rows={rows} cols={callCols} best={best} loading={income.loading} />
      </Section>

      {methods.length > 0 && (
        <Section title="Ventas de obras por método de pago" sub={`Para ${year}, mira Reportes → Obras.`}>
          <YearTable rows={rows} cols={methodCols} best={best} loading={income.loading} />
        </Section>
      )}

      <Section
        title="Por convocatoria"
        sub="Cada feria, salón y pabellón de la plataforma anterior. Las ventas cuentan solo las obras que se pudieron ubicar por su nombre, así que son un mínimo."
      >
        <TextField
          size="small"
          placeholder="Buscar convocatoria o año"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          slotProps={{ htmlInput: { "aria-label": "Buscar convocatoria o año" } }}
          sx={{ mb: 1.5, width: "100%", maxWidth: 360 }}
        />
        <TableContainer sx={{ border: "1px solid", borderColor: "divider", maxHeight: 560 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {["Convocatoria", "Año", "Postulaciones", "Seleccionados", "Inscripción", "Pagadas", "Cobrado", "Obras ofrecidas", "Ventas ubicadas", "Valor ubicado"].map((h, i) => (
                  <TableCell key={h} align={i < 2 ? "left" : "right"} sx={{ whiteSpace: "nowrap" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {fairs.map((f) => (
                <TableRow key={`${f.name}-${f.year}`} hover>
                  <TableCell component="th" scope="row" sx={{ minWidth: 220 }}>{f.name}</TableCell>
                  <TableCell>{f.year ?? "—"}</TableCell>
                  <TableCell align="right">{count(f.applications)}</TableCell>
                  <TableCell align="right">{count(f.accepted)}</TableCell>
                  <TableCell align="right">{f.fee ? money(f.fee) : "Gratis"}</TableCell>
                  <TableCell align="right">{count(f.paidApplications)}</TableCell>
                  <TableCell align="right">{money(f.applicationRevenue)}</TableCell>
                  <TableCell align="right">{count(f.worksOffered)}</TableCell>
                  <TableCell align="right">{count(f.salesMatched)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{money(f.salesMatchedValue)}</TableCell>
                </TableRow>
              ))}
              {fairs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} sx={{ textAlign: "center", color: "text.secondary", py: 3 }}>Ninguna convocatoria coincide.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3, maxWidth: 820, lineHeight: 1.6 }}>
        Los años anteriores salen de la plataforma anterior y suman todo lo de ese año (la feria, salones y pabellones de
        marca). Esa plataforma no guardaba fecha ni feria en las ventas: el año se calculó por la obra vendida, y las de
        2017 a 2019 quedan juntas. Solo cuenta lo que se vendió por esa plataforma, no lo cobrado aparte. Las entradas no
        se vendían ahí: los boletos solo existen desde {year}.
      </Typography>
    </Box>
  );
}
