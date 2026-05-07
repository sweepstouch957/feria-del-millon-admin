"use client";

import React from "react";
import { useQueries } from "@tanstack/react-query";
import {
  Box, Paper, Typography, Stack, Chip,
  LinearProgress, Skeleton, Divider, ButtonBase, alpha,
} from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { useTheme } from "@mui/material/styles";
import Link from "next/link";
import {
  Users, Palette, FileText, DollarSign,
  ArrowRight, Ticket, ClipboardList,
} from "lucide-react";
import { listApplications, type ApplicationListResponse } from "@/services/applications.service";
import { listUsers, type UsersSearchResponse } from "@/services/user.service";
import { listOrders, type OrderDoc } from "@/services/orders.service";

/* ── constants ── */
const GREEN       = "#22c55e";
const APP_FEE_COP = 40_000;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
};

const STATUS_CFG = [
  { key: "pending_payment", label: "Pago pendiente", color: "#f59e0b" },
  { key: "draft",           label: "Borrador",        color: "#6b7280" },
  { key: "submitted",       label: "Enviada",         color: "#60a5fa" },
  { key: "under_review",    label: "En revisión",     color: "#a78bfa" },
  { key: "accepted",        label: "Aceptada",        color: GREEN     },
  { key: "rejected",        label: "Rechazada",       color: "#ef4444" },
] as const;

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo", card_offline: "Datáfono", whatsapp: "WhatsApp",
  credit_card: "Tarjeta", pse: "PSE", mercadopago: "MercadoPago", itau_mock: "Itaú",
};

const NAV_ITEMS = [
  { label: "Solicitudes", sub: "Revisar postulaciones", href: "/solicitudes", color: "#60a5fa", icon: ClipboardList },
  { label: "Usuarios",    sub: "Gestionar cuentas",    href: "/users",       color: "#a78bfa", icon: Users        },
  { label: "Tickets",     sub: "Venta y validación",   href: "/tickets",     color: "#f59e0b", icon: Ticket       },
  { label: "Artistas",    sub: "Portafolios y obras",  href: "/users",       color: GREEN,     icon: Palette      },
];

/* ── shared card style ── */
const card = (dark: boolean) => ({
  p: 2.5, borderRadius: 3,
  bgcolor: dark ? "#111113" : "#ffffff",
  border: `1px solid ${dark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)"}`,
  boxShadow: dark ? "0 4px 28px rgba(0,0,0,.45)" : "0 2px 14px rgba(0,0,0,.06)",
});

/* ══════════════════════════════════════════════════════════════════ */
export default function HomeClient() {
  const theme = useTheme();
  const dark  = theme.palette.mode === "dark";

  const results = useQueries({
    queries: [
      /* 0  — total applications */
      { queryKey: ["dash","apps","all"],    queryFn: () => listApplications({ limit: 1 }),            staleTime: 60_000 },
      /* 1–6 — per-status */
      ...STATUS_CFG.map(s => ({
        queryKey: ["dash","apps", s.key],
        queryFn:  () => listApplications({ status: s.key, limit: 1 }),
        staleTime: 60_000,
      })),
      /* 7  — paid applications */
      { queryKey: ["dash","apps","paid"],   queryFn: () => listApplications({ isPaid: true, limit: 1 }), staleTime: 60_000 },
      /* 8  — total users */
      { queryKey: ["dash","users","total"], queryFn: () => listUsers({ limit: 1 }),                    staleTime: 60_000 },
      /* 9  — artists */
      { queryKey: ["dash","users","art"],   queryFn: () => listUsers({ roles: ["artista"], limit: 1 }), staleTime: 60_000 },
      /* 10 — paid orders */
      { queryKey: ["dash","orders","paid"], queryFn: () => listOrders({ status: "paid" }),             staleTime: 60_000 },
    ],
  });

  const loading = results.some(r => r.isLoading);

  /* derived values — cast each result to its known type */
  const appData   = (r: typeof results[0]) => r.data as ApplicationListResponse | undefined;
  const usrData   = (r: typeof results[0]) => r.data as UsersSearchResponse   | undefined;
  const ordData   = (r: typeof results[0]) => r.data as OrderDoc[]             | undefined;

  const totalApps    = appData(results[0])?.total ?? 0;
  const statusCounts = STATUS_CFG.map((s, i) => ({ ...s, count: appData(results[i + 1])?.total ?? 0 }));
  const paidApps     = appData(results[7])?.total ?? 0;
  const totalUsers   = usrData(results[8])?.total ?? 0;
  const totalArtists = usrData(results[9])?.total ?? 0;
  const paidOrders   = ordData(results[10]) ?? [];

  const revenueApps   = paidApps * APP_FEE_COP;
  const revenueOrders = paidOrders.reduce((s: number, o: OrderDoc) => s + (o.total || 0), 0);
  const totalRevenue  = revenueApps + revenueOrders;

  const acceptedCount = statusCounts.find(s => s.key === "accepted")?.count ?? 0;
  const inProcess     = (statusCounts.find(s => s.key === "under_review")?.count ?? 0)
                      + (statusCounts.find(s => s.key === "submitted")?.count ?? 0);

  const methodBreakdown = paidOrders.reduce<Record<string, number>>((acc: Record<string,number>, o: OrderDoc) => {
    const m = o.payment?.method || "otro";
    acc[m] = (acc[m] || 0) + (o.total || 0);
    return acc;
  }, {});
  const hasMethodData = Object.keys(methodBreakdown).length > 0;

  /* ── render ── */
  return (
    <Box sx={{ pb: 5 }}>

      {/* Header */}
      <Stack direction="row" alignItems="flex-end" justifyContent="space-between" mb={3}>
        <Box>
          <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: GREEN, textTransform: "uppercase", mb: 0.5 }}>
            Panel de control
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.5, color: "text.primary", lineHeight: 1 }}>
            Feria del Millón
          </Typography>
        </Box>
        {!loading && (
          <Chip
            label="En vivo"
            size="small"
            sx={{ bgcolor: alpha(GREEN, 0.1), color: GREEN, fontWeight: 700, border: `1px solid ${alpha(GREEN, 0.3)}`, fontSize: 11 }}
          />
        )}
      </Stack>

      {loading && (
        <LinearProgress sx={{
          mb: 3, borderRadius: 1, height: 3,
          bgcolor: alpha(GREEN, 0.1),
          "& .MuiLinearProgress-bar": { bgcolor: GREEN },
        }} />
      )}

      {/* ── KPI Cards ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4,1fr)" }, gap: 2, mb: 3 }}>
        <KpiCard
          label="Ingresos totales"
          value={loading ? null : fmtShort(totalRevenue)}
          sub={`${fmtShort(revenueApps)} inscripciones · ${fmtShort(revenueOrders)} obras`}
          icon={<DollarSign size={18} />}
          accent={GREEN} dark={dark}
        />
        <KpiCard
          label="Solicitudes"
          value={loading ? null : String(totalApps)}
          sub={`${acceptedCount} aceptadas · ${inProcess} en proceso`}
          icon={<FileText size={18} />}
          accent="#60a5fa" dark={dark}
        />
        <KpiCard
          label="Artistas"
          value={loading ? null : String(totalArtists)}
          sub={`${paidApps} con pago confirmado`}
          icon={<Palette size={18} />}
          accent="#a78bfa" dark={dark}
        />
        <KpiCard
          label="Usuarios"
          value={loading ? null : String(totalUsers)}
          sub="Todos los roles registrados"
          icon={<Users size={18} />}
          accent="#f59e0b" dark={dark}
        />
      </Box>

      {/* ── Charts row ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.6fr 1fr" }, gap: 2, mb: 3 }}>

        {/* Applications funnel */}
        <Paper sx={card(dark)}>
          <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2.5, color: "text.primary", letterSpacing: -.3 }}>
            Solicitudes por estado
          </Typography>
          {loading ? (
            <Stack spacing={1.5}>
              {STATUS_CFG.map(s => <Skeleton key={s.key} variant="rectangular" height={34} sx={{ borderRadius: 1.5 }} />)}
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              {statusCounts.map(s => (
                <Box key={s.key}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.color, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "text.secondary" }}>{s.label}</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                        {totalApps > 0 ? `${Math.round((s.count / totalApps) * 100)}%` : "0%"}
                      </Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: s.color, minWidth: 24, textAlign: "right" }}>
                        {s.count}
                      </Typography>
                    </Stack>
                  </Stack>
                  <Box sx={{ height: 7, borderRadius: 2, bgcolor: alpha(s.color, 0.1), overflow: "hidden" }}>
                    <Box sx={{
                      height: "100%", borderRadius: 2, bgcolor: s.color,
                      width: totalApps > 0 ? `${(s.count / totalApps) * 100}%` : "0%",
                      transition: "width .7s cubic-bezier(.16,1,.3,1)",
                    }} />
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        {/* Revenue breakdown */}
        <Paper sx={card(dark)}>
          <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2, color: "text.primary", letterSpacing: -.3 }}>
            Ingresos por fuente
          </Typography>
          {loading ? (
            <Box display="flex" justifyContent="center" pt={1}>
              <Skeleton variant="circular" width={150} height={150} />
            </Box>
          ) : totalRevenue > 0 ? (
            <PieChart
              height={165}
              series={[{
                data: [
                  { id: 0, value: revenueApps,   label: "Inscripciones", color: GREEN    },
                  { id: 1, value: revenueOrders, label: "Ventas obras",  color: "#60a5fa" },
                ],
                innerRadius: 42, paddingAngle: 3, cornerRadius: 4,
                highlightScope: { fade: "global", highlight: "item" },
              }]}
              slotProps={{ legend: { hidden: true } as never }}
            />
          ) : (
            <Box display="flex" alignItems="center" justifyContent="center" height={165}>
              <Typography sx={{ fontSize: 12, color: "text.disabled" }}>Sin ingresos registrados aún</Typography>
            </Box>
          )}

          <Divider sx={{ my: 2, borderColor: "divider" }} />
          <Stack spacing={1}>
            <RevenueRow
              label="Inscripciones artistas"
              amount={revenueApps}
              color={GREEN}
              badge={`${paidApps} pagos`}
            />
            <RevenueRow
              label="Venta de obras"
              amount={revenueOrders}
              color="#60a5fa"
              badge={`${paidOrders.length ?? 0} órdenes`}
            />
            <Divider sx={{ borderColor: "divider", my: 0.5 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary" }}>Total</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 900, color: GREEN }}>{fmt(totalRevenue)}</Typography>
            </Stack>
          </Stack>
        </Paper>
      </Box>

      {/* ── Payment methods chart ── */}
      {(hasMethodData || loading) && (
        <Paper sx={{ ...card(dark), mb: 3 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 0.5, color: "text.primary", letterSpacing: -.3 }}>
            Métodos de pago — ventas de obras
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 2 }}>
            Distribución de ingresos por canal de pago en órdenes pagadas
          </Typography>
          {loading ? (
            <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
          ) : (
            <BarChart
              height={190}
              series={[{
                data:  Object.values(methodBreakdown),
                color: GREEN,
                label: "Ingresos (COP)",
              }]}
              xAxis={[{
                scaleType: "band",
                data: Object.keys(methodBreakdown).map(m => METHOD_LABELS[m] || m),
              }]}
              yAxis={[{ valueFormatter: (v: number) => fmtShort(v) }]}
              sx={{
                "& .MuiChartsAxis-tickLabel": { fill: dark ? "rgba(255,255,255,.45)" : "rgba(0,0,0,.45)", fontSize: 11 },
                "& .MuiChartsAxis-line": { stroke: dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.08)" },
              }}
            />
          )}
        </Paper>
      )}

      {/* ── Quick navigation ── */}
      <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: "text.disabled", textTransform: "uppercase", mb: 1.5 }}>
        Acceso rápido
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4,1fr)" }, gap: 1.5 }}>
        {NAV_ITEMS.map(n => <NavCard key={n.href + n.label} {...n} dark={dark} />)}
      </Box>

    </Box>
  );
}

/* ─────────── Sub-components ─────────── */

function KpiCard({ label, value, sub, icon, accent, dark }: {
  label: string; value: string | null; sub: string;
  icon: React.ReactNode; accent: string; dark: boolean;
}) {
  return (
    <Paper sx={{ ...card(dark), position: "relative", overflow: "hidden" }}>
      <Box sx={{
        position: "absolute", top: -24, right: -24,
        width: 80, height: 80, borderRadius: "50%",
        background: alpha(accent, 0.07), pointerEvents: "none",
      }} />
      <Box sx={{
        width: 36, height: 36, borderRadius: 2, mb: 2,
        bgcolor: alpha(accent, 0.12), color: accent,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </Box>
      {value === null ? (
        <Skeleton variant="text" width={90} height={44} sx={{ mb: 0.5 }} />
      ) : (
        <Typography sx={{ fontSize: 32, fontWeight: 900, letterSpacing: -2, color: "text.primary", lineHeight: 1, mb: 0.75 }}>
          {value}
        </Typography>
      )}
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "text.primary", mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontSize: 11, color: "text.secondary", lineHeight: 1.4 }}>{sub}</Typography>
    </Paper>
  );
}

function RevenueRow({ label, amount, color, badge }: {
  label: string; amount: number; color: string; badge: string;
}) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
      <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 12, color: "text.secondary", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {label}
        </Typography>
        <Chip
          label={badge} size="small"
          sx={{ height: 16, fontSize: 9, fontWeight: 700, px: 0.5, bgcolor: alpha(color, 0.1), color, flexShrink: 0 }}
        />
      </Stack>
      <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: "text.primary", whiteSpace: "nowrap" }}>
        {fmt(amount)}
      </Typography>
    </Stack>
  );
}

function NavCard({ label, sub, href, color, icon: Icon, dark }: {
  label: string; sub: string; href: string; color: string;
  icon: React.ElementType; dark: boolean;
}) {
  return (
    <ButtonBase
      component={Link}
      href={href}
      sx={{
        display: "flex", flexDirection: "column", alignItems: "flex-start",
        p: 2, borderRadius: 2.5, textAlign: "left", width: "100%",
        bgcolor: dark ? "rgba(255,255,255,.025)" : "#f9fafb",
        border: `1px solid ${dark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)"}`,
        transition: "all .2s cubic-bezier(.16,1,.3,1)",
        "&:hover": {
          bgcolor: alpha(color, 0.08),
          borderColor: alpha(color, 0.35),
          transform: "translateY(-2px)",
          boxShadow: `0 8px 24px ${alpha(color, 0.15)}`,
        },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%" mb={1}>
        <Box sx={{ color, display: "flex", p: 0.75, borderRadius: 1.5, bgcolor: alpha(color, 0.1) }}>
          <Icon size={16} />
        </Box>
        <Box sx={{ color: "text.disabled", display: "flex" }}><ArrowRight size={14} /></Box>
      </Stack>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{sub}</Typography>
    </ButtonBase>
  );
}
