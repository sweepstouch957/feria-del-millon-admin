"use client";

import { Alert, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import ReportTabs from "@/components/ui/ReportTabs";
import { eyebrow } from "@/app/theme";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { formatCOP } from "@/utils/money";
import { useIncome } from "../hooks/useIncome";
import { bestByMetric, currentYearRow, METRICS, rankOf, type YearRow } from "../model/fairHistory";
import history from "../model/fairHistory.json";

const show = (v: unknown, money?: boolean) => (money ? formatCOP(Number(v) || 0, { code: true }) : (Number(v) || 0).toLocaleString("es-CO"));

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
  const current = currentYearRow(year, income);
  const past = (history.years as YearRow[]).filter((r) => r.year !== year);
  const rows = [current, ...[...past].reverse()];
  const best = bestByMetric(rows);
  const total = rows.length;

  return (
    <Box>
      <PageHeader
        crumb="Reportes"
        title="Ferias anteriores"
        description={`La feria ${year} contra cada año desde 2017. La cifra más alta de cada columna sale en verde.`}
      />
      <ReportTabs />
      {income.failed && <Alert severity="error" sx={{ mb: 2 }}>Una parte de las cifras de {year} no cargó. Vuelve a abrir la página.</Alert>}

      <KpiStrip
        loading={income.loading}
        items={METRICS.slice(0, 4).map((m) => ({
          label: `${m.label} ${year}`,
          value: show(current[m.key], m.money),
          sub: `Puesto ${rankOf(rows, year, m.key)} de ${total}${best[m.key] === year ? " · el mejor año" : ""}`,
        }))}
      />

      <TableContainer sx={{ border: "1px solid", borderColor: "divider" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Año</TableCell>
              {METRICS.map((m) => (
                <TableCell key={m.key} align="right" sx={{ whiteSpace: "nowrap" }}>{m.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.year} sx={r.current ? { bgcolor: "action.hover" } : undefined}>
                <TableCell sx={{ whiteSpace: "nowrap", fontWeight: r.current ? 600 : 400 }}>
                  {r.year}
                  {r.current && <Typography component="span" sx={{ ...eyebrow, fontSize: 9, ml: 1, color: "primary.main" }}>En curso</Typography>}
                </TableCell>
                {METRICS.map((m) => {
                  const top = best[m.key] === r.year;
                  return (
                    <TableCell key={m.key} align="right" sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: top ? "primary.main" : undefined, fontWeight: top ? 600 : undefined }}>
                      {income.loading && r.current ? "…" : show(r[m.key], m.money)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, maxWidth: 820, lineHeight: 1.6 }}>
        Los años anteriores salen de la plataforma anterior y suman todo lo de ese año (la feria, salones y pabellones de
        marca). Esa plataforma no guardaba fecha ni feria en las ventas: el año se calculó por la obra vendida, y las de
        2017 a 2019 quedan juntas. Solo cuenta lo que se vendió por esa plataforma, no lo cobrado aparte. Las entradas no
        se vendían ahí; en {year} van {show(current.ticketRevenue, true)} en boletos, que no están en esta tabla.
      </Typography>
    </Box>
  );
}
