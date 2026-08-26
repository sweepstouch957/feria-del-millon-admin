"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, Button, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, CircularProgress,
} from "@mui/material";
import { BarChart3, Download, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getApplicationStats } from "@services/applications.service";
import { listOrders, type OrderDoc } from "@services/orders.service";

const money = (n?: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", currencyDisplay: "code", maximumFractionDigits: 0 }).format(Number(n || 0));

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Sin pagar inscripción",
  draft: "En borrador",
  submitted: "Enviadas",
  under_review: "En revisión",
  revision_requested: "Corrección pedida",
  accepted: "Aceptadas",
  rejected: "Rechazadas",
};

const isCaja = (o: OrderDoc) => {
  const m = o.payment?.method || "";
  return m === "cash" || m === "card_offline" || o.invoice?.channel === "event_pos";
};

function KpiCard({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Card sx={{ borderRadius: 3, flex: 1, minWidth: 150 }}><CardContent>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography fontWeight={900} fontSize={24} color={color}>{value}</Typography>
    </CardContent></Card>
  );
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export default function ReportesPage() {
  const appsQ = useQuery({ queryKey: ["report", "apps"], queryFn: getApplicationStats, staleTime: 60_000 });
  const ordersQ = useQuery({ queryKey: ["report", "orders"], queryFn: () => listOrders({}), staleTime: 60_000 });

  const loading = appsQ.isLoading || ordersQ.isLoading;
  const orders = ordersQ.data ?? [];

  const paidOrders = orders.filter((o) => o.status === "paid");
  const partialOrders = orders.filter((o) => o.status === "partial");
  const revenue = paidOrders.reduce((a, o) => a + Number(o.total || 0), 0);
  const cajaOrders = paidOrders.filter(isCaja);
  const onlineOrders = paidOrders.filter((o) => !isCaja(o));
  const cajaRevenue = cajaOrders.reduce((a, o) => a + Number(o.total || 0), 0);
  const onlineRevenue = onlineOrders.reduce((a, o) => a + Number(o.total || 0), 0);
  const cartera = partialOrders.reduce((a, o) => a + Number(o.layaway?.balanceDue || 0), 0);
  const carteraAbonado = partialOrders.reduce((a, o) => a + Number(o.layaway?.amountPaid || 0), 0);

  const apps = appsQ.data;
  const byStatus = apps?.byStatus || {};

  const exportAll = () => {
    const rows: (string | number)[][] = [
      ["Reporte — Feria del Millón"],
      [],
      ["SOLICITUDES", ""],
      ["Total", apps?.total ?? 0],
      ["Con inscripción pagada", apps?.paid ?? 0],
      ...Object.entries(byStatus).map(([k, v]) => [STATUS_LABEL[k] || k, v]),
      [],
      ["VENTAS", ""],
      ["Órdenes pagadas", paidOrders.length],
      ["Ingresos totales (COP)", revenue],
      ["Ventas en caja (COP)", cajaRevenue],
      ["Ventas en línea (COP)", onlineRevenue],
      [],
      ["CARTERA (FIADO)", ""],
      ["Órdenes con saldo", partialOrders.length],
      ["Abonado (COP)", carteraAbonado],
      ["Saldo pendiente (COP)", cartera],
    ];
    downloadCsv(`reporte-feria-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(63,164,110,0.14)", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BarChart3 size={20} />
        </Box>
        <Box flex={1}>
          <Typography fontWeight={900} fontSize={20}>Reportes</Typography>
          <Typography variant="caption" color="text.secondary">Solicitudes, ventas (caja vs línea) y cartera de fiado.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => { appsQ.refetch(); ordersQ.refetch(); }} sx={{ textTransform: "none" }}>Actualizar</Button>
        <Button variant="contained" disableElevation startIcon={<Download size={16} />} onClick={exportAll}
          sx={{ textTransform: "none", bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" } }}>Exportar CSV</Button>
      </Stack>

      {loading ? (
        <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Box>
      ) : (
        <Stack spacing={3}>
          {/* Solicitudes */}
          <Box>
            <Typography fontWeight={800} fontSize={15} mb={1.5}>Solicitudes</Typography>
            <Stack direction="row" flexWrap="wrap" gap={2} mb={2}>
              <KpiCard label="Total solicitudes" value={apps?.total ?? 0} />
              <KpiCard label="Inscripción pagada" value={apps?.paid ?? 0} color="#16a34a" />
              <KpiCard label="Aceptadas" value={byStatus["accepted"] ?? 0} color="#16a34a" />
              <KpiCard label="Rechazadas" value={byStatus["rejected"] ?? 0} color="#b91c1c" />
            </Stack>
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Estado</TableCell><TableCell align="right">Cantidad</TableCell></TableRow></TableHead>
                <TableBody>
                  {Object.entries(byStatus).map(([k, v]) => (
                    <TableRow key={k}><TableCell>{STATUS_LABEL[k] || k}</TableCell><TableCell align="right">{v}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Divider />

          {/* Ventas */}
          <Box>
            <Typography fontWeight={800} fontSize={15} mb={1.5}>Ventas de obras</Typography>
            <Stack direction="row" flexWrap="wrap" gap={2}>
              <KpiCard label="Órdenes pagadas" value={paidOrders.length} />
              <KpiCard label="Ingresos totales" value={money(revenue)} color="#16a34a" />
              <KpiCard label={`En caja (${cajaOrders.length})`} value={money(cajaRevenue)} />
              <KpiCard label={`En línea (${onlineOrders.length})`} value={money(onlineRevenue)} />
            </Stack>
          </Box>

          <Divider />

          {/* Cartera */}
          <Box>
            <Typography fontWeight={800} fontSize={15} mb={1.5}>Cartera (fiado)</Typography>
            <Stack direction="row" flexWrap="wrap" gap={2}>
              <KpiCard label="Obras apartadas" value={partialOrders.length} />
              <KpiCard label="Abonado" value={money(carteraAbonado)} />
              <KpiCard label="Saldo pendiente" value={money(cartera)} color="#b45309" />
            </Stack>
          </Box>
        </Stack>
      )}
    </Box>
  );
}
