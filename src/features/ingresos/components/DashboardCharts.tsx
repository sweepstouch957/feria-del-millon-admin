"use client";

import * as React from "react";
import Link from "next/link";
import { Box, Skeleton, Tooltip, Typography, useTheme } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { eyebrow } from "@/app/theme";
import { formatCOP } from "@/utils/money";
import type { MonthIncome } from "../model/income";

/* Piezas del Tablero. Colores validados con el verificador de paletas sobre el
   fondo de cada modo; en oscuro cada uno tiene su propio paso. El color sigue a
   la fuente de dinero: inscripciones siempre verde, obras ámbar, boletos azul. */
const SOURCE_COLORS = {
  light: { apps: "#2F8F5B", orders: "#C9902B", tickets: "#4C78C8" },
  dark: { apps: "#3FA46E", orders: "#B07F20", tickets: "#5C8FE6" },
} as const;

export const SOURCE_LABELS = { apps: "Inscripciones", orders: "Obras", tickets: "Boletos" } as const;
export type Source = keyof typeof SOURCE_LABELS;
const SOURCES: Source[] = ["apps", "orders", "tickets"];

const useSourceColors = () => SOURCE_COLORS[useTheme().palette.mode];
const money = (n: number) => formatCOP(n);
const compactMoney = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M` : n >= 1e3 ? `$${Math.round(n / 1e3)} mil` : `$${n}`);
const monthName = (m: string) =>
  new Date(`${m}-15T12:00:00Z`).toLocaleDateString("es-CO", { month: "short", timeZone: "UTC" }).replace(".", "");

export function Panel({ title, sub, href, linkLabel, loading, children }: {
  title: string; sub?: string; href?: string; linkLabel?: string; loading?: boolean; children: React.ReactNode;
}) {
  return (
    <Box component="section" sx={{ border: "1px solid", borderColor: "divider", p: { xs: 2, md: 2.5 }, minWidth: 0, display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, mb: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={{ ...eyebrow, color: "text.primary" }}>{title}</Typography>
          {sub && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>{sub}</Typography>}
        </Box>
        {href && (
          <Box component={Link} href={href} sx={{ ...eyebrow, fontSize: 9.5, color: "primary.main", textDecoration: "none", whiteSpace: "nowrap", "&:hover": { textDecoration: "underline" } }}>
            {linkLabel || "Ver detalle"}
          </Box>
        )}
      </Box>
      {loading ? <Skeleton variant="rectangular" height={180} /> : children}
    </Box>
  );
}

/** Ingresos por mes, apilados por fuente. La leyenda lleva el total de cada una. */
export function MonthlyIncomeChart({ data, totals }: { data: MonthIncome[]; totals: Record<Source, number> }) {
  const colors = useSourceColors();
  const present = SOURCES.filter((s) => totals[s] > 0);
  if (!data.length) return <Empty text="Todavía no hay ingresos." />;
  return (
    <>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.5, mb: 1 }}>
        {present.map((s) => (
          <Box key={s} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "2px", backgroundColor: colors[s] }} />
            <Typography variant="caption" color="text.secondary">
              {SOURCE_LABELS[s]} · <Box component="span" sx={{ color: "text.primary" }}>{compactMoney(totals[s])}</Box>
            </Typography>
          </Box>
        ))}
      </Box>
      <BarChart
        height={260}
        hideLegend
        borderRadius={4}
        grid={{ horizontal: true }}
        margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
        xAxis={[{ scaleType: "band", data: data.map((d) => monthName(d.month)), categoryGapRatio: 0.55, disableLine: true, disableTicks: true }]}
        yAxis={[{ valueFormatter: compactMoney, disableLine: true, disableTicks: true, width: 56 }]}
        series={present.map((s) => ({
          data: data.map((d) => d[s]),
          label: SOURCE_LABELS[s],
          color: colors[s],
          stack: "ingresos",
          valueFormatter: (v: number | null) => (v ? money(v) : null),
        }))}
      />
    </>
  );
}

/** De dónde viene la plata: una barra partida y su detalle. */
export function SourceSplit({ totals }: { totals: Record<Source, number> }) {
  const colors = useSourceColors();
  const total = SOURCES.reduce((s, k) => s + totals[k], 0);
  if (!total) return <Empty text="Todavía no hay ingresos." />;
  const pct = (n: number) => `${((n / total) * 100).toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;
  return (
    <>
      <Typography sx={{ fontWeight: 200, fontSize: "clamp(26px, 2.6vw, 36px)", lineHeight: 1.1, color: "primary.main", mb: 1.5 }}>{money(total)}</Typography>
      <Box sx={{ display: "flex", gap: "2px", height: 14, mb: 2 }}>
        {SOURCES.filter((s) => totals[s] > 0).map((s) => (
          <Tooltip key={s} arrow title={`${SOURCE_LABELS[s]}: ${money(totals[s])} (${pct(totals[s])})`}>
            <Box sx={{ flexGrow: totals[s], flexBasis: 0, minWidth: 4, backgroundColor: colors[s], borderRadius: "2px" }} />
          </Tooltip>
        ))}
      </Box>
      {SOURCES.map((s) => (
        <Box key={s} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.9, borderTop: "1px solid", borderColor: "divider" }}>
          <Box sx={{ width: 10, height: 10, borderRadius: "2px", flexShrink: 0, backgroundColor: colors[s] }} />
          <Typography variant="body2" sx={{ flexGrow: 1 }}>{SOURCE_LABELS[s]}</Typography>
          <Typography variant="caption" color="text.secondary">{pct(totals[s])}</Typography>
          <Typography variant="body2" sx={{ minWidth: 120, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money(totals[s])}</Typography>
        </Box>
      ))}
    </>
  );
}

export type MeterRow = { label: string; value: number; of: number; text?: string; muted?: boolean };

/** Filas con barra: cada una se mide contra su propio total y lleva su número escrito. */
export function MeterList({ rows, empty = "Sin datos todavía." }: { rows: MeterRow[]; empty?: string }) {
  if (!rows.length) return <Empty text={empty} />;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {rows.map((r) => {
        const share = r.of > 0 ? Math.min(r.value / r.of, 1) : 0;
        const pct = `${(share * 100).toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;
        return (
          <Tooltip key={r.label} arrow placement="top" title={`${r.label}: ${r.value.toLocaleString("es-CO")} de ${r.of.toLocaleString("es-CO")} (${pct})`}>
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, mb: 0.5 }}>
                <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>{r.label}</Typography>
                <Typography variant="body2" sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                  {r.text ?? r.value.toLocaleString("es-CO")}
                  <Box component="span" sx={{ ml: 1, color: "text.secondary", fontSize: 12 }}>{pct}</Box>
                </Typography>
              </Box>
              <Box role="meter" aria-label={r.label} aria-valuemin={0} aria-valuemax={r.of} aria-valuenow={r.value} sx={{ height: 6, backgroundColor: "divider" }}>
                <Box sx={{ height: "100%", width: `${share * 100}%`, minWidth: r.value > 0 ? 3 : 0, backgroundColor: r.muted ? "text.secondary" : "primary.main", borderRadius: "0 2px 2px 0" }} />
              </Box>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

function Empty({ text }: { text: string }) {
  return <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>{text}</Typography>;
}
