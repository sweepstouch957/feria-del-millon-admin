"use client";

import * as React from "react";
import {
  Box,
  TextField,
  MenuItem, Card, CardContent, Typography, Stack, Button, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, CircularProgress,
} from "@mui/material";
import { Download, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getApplicationStats } from "@services/applications.service";
import { getConvocatorias } from "@services/events.service";
import { listOrders, type OrderDoc } from "@services/orders.service";
import { formatCOP } from "@/utils/money";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import { eyebrow } from "@/app/theme";

const money = (n?: number) => formatCOP(n, { code: true });

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

/** Título de bloque del informe. */
function BlockTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ ...eyebrow, fontSize: 10, color: "text.secondary", mb: 1.5 }}>
      {children}
    </Typography>
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
  // Un reporte de "todas las ediciones juntas" no dice nada útil: cada feria
  // tiene su propia convocatoria y sus propios números.
  const [conv, setConv] = React.useState("");

  const convQ = useQuery({
    queryKey: ["convocatorias"],
    queryFn: getConvocatorias,
    staleTime: 5 * 60_000,
  });

  const appsQ = useQuery({
    queryKey: ["report", "apps", conv],
    queryFn: () => getApplicationStats(conv || undefined),
    staleTime: 60_000,
  });
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
    const convName =
      ((convQ.data as any[]) ?? []).find((c) => (c._id || c.id) === conv)?.name ||
      "todas-las-ediciones";
    rows.unshift(["Convocatoria", convName]);
    downloadCsv(
      `reporte-${convName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`,
      rows
    );
  };

  return (
    <Box>
      <PageHeader
        crumb="Reportes"
        title="Reportes"
        description="Solicitudes, ventas (caja frente a línea) y cartera de fiado."
        actions={[
          {
            label: "Actualizar",
            kind: "sec",
            icon: <RefreshCw size={14} />,
            onClick: () => {
              appsQ.refetch();
              ordersQ.refetch();
            },
          },
          { label: "Exportar CSV", kind: "pri", icon: <Download size={14} />, onClick: exportAll },
        ]}
      >
        <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
          <Typography sx={{ ...eyebrow, fontSize: 9.5, color: "text.secondary" }}>Convocatoria</Typography>
          <TextField
            select
            size="small"
            value={conv}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConv(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Todas las ediciones</MenuItem>
            {((convQ.data as any[]) ?? []).map((c) => (
              <MenuItem key={c._id || c.id} value={c._id || c.id}>
                {c.name || c.slug || "Convocatoria"}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </PageHeader>

      {loading ? (
        <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Box>
      ) : (
        <Stack gap={4}>
          {/* Solicitudes */}
          <Box>
            <BlockTitle>Solicitudes</BlockTitle>
            <KpiStrip
              items={[
                { label: "Total solicitudes", value: apps?.total ?? 0 },
                { label: "Inscripción pagada", value: apps?.paid ?? 0, accent: true },
                { label: "Aceptadas", value: byStatus["accepted"] ?? 0 },
                { label: "Rechazadas", value: byStatus["rejected"] ?? 0 },
              ]}
            />
            <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Estado</TableCell><TableCell align="right">Cantidad</TableCell><TableCell align="right">%</TableCell></TableRow></TableHead>
                <TableBody>
                  {Object.entries(byStatus).map(([k, v]) => (
                    <TableRow key={k} hover>
                      <TableCell>{STATUS_LABEL[k] || k}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>{v}</TableCell>
                      <TableCell align="right" sx={{ color: "text.secondary" }}>
                        {apps?.total ? `${Math.round((Number(v) / apps.total) * 100)}%` : "0%"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Ventas */}
          <Box>
            <BlockTitle>Ventas de obras</BlockTitle>
            <KpiStrip
              items={[
                { label: "Órdenes pagadas", value: paidOrders.length },
                { label: "Ingresos totales", value: money(revenue), accent: true },
                { label: `En caja (${cajaOrders.length})`, value: money(cajaRevenue) },
                { label: `En línea (${onlineOrders.length})`, value: money(onlineRevenue) },
              ]}
            />
          </Box>

          {/* Cartera */}
          <Box>
            <BlockTitle>Cartera (fiado)</BlockTitle>
            <KpiStrip
              items={[
                { label: "Obras apartadas", value: partialOrders.length },
                { label: "Abonado", value: money(carteraAbonado) },
                { label: "Saldo pendiente", value: money(cartera) },
              ]}
            />
          </Box>
        </Stack>
      )}
    </Box>
  );
}
