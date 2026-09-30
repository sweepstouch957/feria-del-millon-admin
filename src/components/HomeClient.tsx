"use client";

import React from "react";
import { useQueries } from "@tanstack/react-query";
import { Box, Card, LinearProgress, Skeleton, Stack, Typography } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { useTheme } from "@mui/material/styles";

import { listApplications, type ApplicationListResponse } from "@/services/applications.service";
import { listUsers, type UsersSearchResponse } from "@/services/user.service";
import { listOrders, type OrderDoc } from "@/services/orders.service";
import { formatCOP } from "@/utils/money";
import { FDM, eyebrow } from "@/app/theme";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import StatusPill from "@/components/ui/StatusPill";

/* Tablero: de dónde viene el dinero y en qué estado está la convocatoria.
   Todo en filetes y versalitas, sin tarjetas de color ni sombras. */

const APP_FEE_COP = 40_000;

const fmt = (n: number) => formatCOP(n);
const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
};

const STATUS_CFG = [
  { key: "pending_payment", label: "Pago pendiente" },
  { key: "draft", label: "Borrador" },
  { key: "submitted", label: "Enviada" },
  { key: "under_review", label: "En revisión" },
  { key: "accepted", label: "Aceptada" },
  { key: "rejected", label: "Rechazada" },
] as const;

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card_offline: "Datáfono",
  whatsapp: "WhatsApp",
  credit_card: "Tarjeta",
  pse: "PSE",
  mercadopago: "MercadoPago",
  itau_mock: "Itaú",
};

/** Título de panel: cuerpo 17 y un filete abajo, como en el diseño. */
function PanelTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <Stack
      direction="row"
      alignItems="baseline"
      justifyContent="space-between"
      gap={1.5}
      sx={{ pb: 1.5, mb: 0.5, borderBottom: "1px solid", borderColor: "divider" }}
    >
      <Typography sx={{ fontSize: 17, letterSpacing: "0.01em" }}>{children}</Typography>
      {aside && (
        <Typography sx={{ ...eyebrow, fontSize: 9.5, letterSpacing: "0.22em", color: "text.secondary" }}>
          {aside}
        </Typography>
      )}
    </Stack>
  );
}

export default function HomeClient() {
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";

  const results = useQueries({
    queries: [
      { queryKey: ["dash", "apps", "all"], queryFn: () => listApplications({ limit: 1 }), staleTime: 60_000 },
      ...STATUS_CFG.map((s) => ({
        queryKey: ["dash", "apps", s.key],
        queryFn: () => listApplications({ status: s.key, limit: 1 }),
        staleTime: 60_000,
      })),
      { queryKey: ["dash", "apps", "paid"], queryFn: () => listApplications({ isPaid: true, limit: 1 }), staleTime: 60_000 },
      { queryKey: ["dash", "users", "total"], queryFn: () => listUsers({ limit: 1 }), staleTime: 60_000 },
      { queryKey: ["dash", "users", "art"], queryFn: () => listUsers({ roles: ["artista"], limit: 1 }), staleTime: 60_000 },
      { queryKey: ["dash", "orders", "paid"], queryFn: () => listOrders({ status: "paid" }), staleTime: 60_000 },
    ],
  });

  const loading = results.some((r) => r.isLoading);

  const appData = (r: (typeof results)[0]) => r.data as ApplicationListResponse | undefined;
  const usrData = (r: (typeof results)[0]) => r.data as UsersSearchResponse | undefined;
  const ordData = (r: (typeof results)[0]) => r.data as OrderDoc[] | undefined;

  const totalApps = appData(results[0])?.total ?? 0;
  const statusCounts = STATUS_CFG.map((s, i) => ({ ...s, count: appData(results[i + 1])?.total ?? 0 }));
  const paidApps = appData(results[7])?.total ?? 0;
  const totalUsers = usrData(results[8])?.total ?? 0;
  const totalArtists = usrData(results[9])?.total ?? 0;
  const paidOrders = ordData(results[10]) ?? [];

  const revenueApps = paidApps * APP_FEE_COP;
  const revenueOrders = paidOrders.reduce((s: number, o: OrderDoc) => s + (o.total || 0), 0);
  const totalRevenue = revenueApps + revenueOrders;
  const shareApps = totalRevenue > 0 ? (revenueApps / totalRevenue) * 100 : 0;

  const acceptedCount = statusCounts.find((s) => s.key === "accepted")?.count ?? 0;
  const inProcess =
    (statusCounts.find((s) => s.key === "under_review")?.count ?? 0) +
    (statusCounts.find((s) => s.key === "submitted")?.count ?? 0);

  const methodBreakdown = paidOrders.reduce<Record<string, number>>((acc, o: OrderDoc) => {
    const m = o.payment?.method || "otro";
    acc[m] = (acc[m] || 0) + (o.total || 0);
    return acc;
  }, {});
  const hasMethodData = Object.keys(methodBreakdown).length > 0;

  const pct = (n: number) => (totalApps > 0 ? Math.round((n / totalApps) * 100) : 0);

  return (
    <Box>
      <PageHeader
        crumb="General"
        title="Tablero"
        badge={!loading ? <StatusPill label="En vivo" tone="ok" dot /> : undefined}
        description="Feria del Millón · resumen de inscripciones, solicitudes y ventas."
      />

      <Box sx={{ height: 2, mb: 2 }}>{loading && <LinearProgress />}</Box>

      <KpiStrip
        loading={loading}
        items={[
          {
            label: "Ingresos totales",
            value: fmtShort(totalRevenue),
            sub: `${fmtShort(revenueApps)} inscripciones · ${fmtShort(revenueOrders)} obras`,
            accent: true,
          },
          {
            label: "Solicitudes",
            value: totalApps.toLocaleString("es-CO"),
            sub: `${acceptedCount} aceptadas · ${inProcess} en proceso`,
          },
          {
            label: "Artistas",
            value: totalArtists.toLocaleString("es-CO"),
            sub: `${paidApps} con pago confirmado`,
          },
          {
            label: "Usuarios",
            value: totalUsers.toLocaleString("es-CO"),
            sub: "Todos los roles registrados",
          },
        ]}
      />

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "stretch",
        }}
      >
        {/* Solicitudes por estado */}
        <Card sx={{ flex: "2 1 460px", minWidth: "min(100%, 300px)", p: { xs: 2, md: 2.5 } }}>
          <PanelTitle aside={`${totalApps.toLocaleString("es-CO")} en total`}>
            Solicitudes por estado
          </PanelTitle>

          {loading
            ? STATUS_CFG.map((s) => <Skeleton key={s.key} variant="text" height={38} />)
            : statusCounts.map((s) => (
                <Box
                  key={s.key}
                  sx={{
                    py: 1.4,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    "&:last-of-type": { borderBottom: 0 },
                  }}
                >
                  <Stack direction="row" alignItems="baseline" gap={1.25} sx={{ mb: 0.9 }}>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {s.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {pct(s.count)}%
                    </Typography>
                    <Typography
                      sx={{ fontSize: 14, fontVariantNumeric: "tabular-nums", minWidth: 36, textAlign: "right" }}
                    >
                      {s.count.toLocaleString("es-CO")}
                    </Typography>
                  </Stack>
                  <Box sx={{ height: 2, backgroundColor: "divider" }}>
                    <Box
                      sx={{
                        height: "100%",
                        width: `${pct(s.count)}%`,
                        backgroundColor: "primary.main",
                        transition: "width .7s cubic-bezier(.16,1,.3,1)",
                      }}
                    />
                  </Box>
                </Box>
              ))}
        </Card>

        {/* Ingresos por fuente */}
        <Card sx={{ flex: "1 1 300px", minWidth: "min(100%, 280px)", p: { xs: 2, md: 2.5 } }}>
          <PanelTitle>Ingresos por fuente</PanelTitle>

          <Box sx={{ display: "flex", justifyContent: "center", py: 1.5 }}>
            {loading ? (
              <Skeleton variant="circular" width={150} height={150} />
            ) : (
              <Box
                sx={{
                  position: "relative",
                  width: 150,
                  height: 150,
                  borderRadius: 999,
                  background: `conic-gradient(${FDM.green} 0 ${shareApps}%, ${FDM.greenDeep} ${shareApps}% 100%)`,
                  ...(totalRevenue === 0 && { background: theme.palette.divider }),
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: "14px",
                    borderRadius: 999,
                    backgroundColor: "background.default",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Box sx={{ textAlign: "center" }}>
                    <Typography sx={{ fontWeight: 200, fontSize: 28, lineHeight: 1 }}>
                      {Math.round(shareApps)}%
                    </Typography>
                    <Typography sx={{ ...eyebrow, fontSize: 9, color: "text.secondary", mt: 0.5 }}>
                      Inscripciones
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>

          <Stack>
            {[
              { label: "Inscripciones artistas", sub: `${paidApps} pagos`, amount: revenueApps, filled: true },
              { label: "Venta de obras", sub: `${paidOrders.length} órdenes`, amount: revenueOrders, filled: false },
            ].map((r) => (
              <Stack
                key={r.label}
                direction="row"
                alignItems="center"
                gap={1.25}
                sx={{ py: 1.15, borderTop: "1px solid", borderColor: "divider" }}
              >
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    flex: "0 0 auto",
                    backgroundColor: r.filled ? "primary.main" : "transparent",
                    border: r.filled ? 0 : "1px solid",
                    borderColor: "text.secondary",
                  }}
                />
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                  {r.label}{" "}
                  <Typography component="span" variant="caption" color="text.secondary">
                    · {r.sub}
                  </Typography>
                </Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {fmt(r.amount)}
                </Typography>
              </Stack>
            ))}
            <Stack
              direction="row"
              alignItems="baseline"
              gap={1.25}
              sx={{ pt: 1.5, borderTop: "1px solid", borderColor: "text.disabled" }}
            >
              <Typography sx={{ ...eyebrow, fontSize: 9.5, letterSpacing: "0.22em", flex: 1 }}>Total</Typography>
              <Typography sx={{ fontSize: 20, fontWeight: 300, color: "primary.main", whiteSpace: "nowrap" }}>
                {fmt(totalRevenue)}
              </Typography>
            </Stack>
          </Stack>
        </Card>
      </Box>

      {/* Métodos de pago (solo si hubo ventas de obra) */}
      {(hasMethodData || loading) && (
        <Card sx={{ mt: 2, p: { xs: 2, md: 2.5 } }}>
          <PanelTitle aside="Órdenes pagadas">Métodos de pago · venta de obras</PanelTitle>
          {loading ? (
            <Skeleton variant="rectangular" height={180} />
          ) : (
            <BarChart
              height={210}
              series={[{ data: Object.values(methodBreakdown), color: FDM.green, label: "Ingresos (COP)" }]}
              xAxis={[
                {
                  scaleType: "band",
                  data: Object.keys(methodBreakdown).map((m) => METHOD_LABELS[m] || m),
                },
              ]}
              yAxis={[{ valueFormatter: (v: number) => fmtShort(v) }]}
              sx={{
                "& .MuiChartsAxis-tickLabel": {
                  fill: dark ? "rgba(240,239,234,.55)" : "rgba(11,11,10,.55)",
                  fontSize: 11,
                },
                "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": {
                  stroke: theme.palette.divider,
                },
              }}
            />
          )}
        </Card>
      )}
    </Box>
  );
}
