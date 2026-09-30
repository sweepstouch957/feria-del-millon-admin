"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
  CircularProgress, LinearProgress,
} from "@mui/material";
import { RefreshCw, FileSpreadsheet, Plus } from "lucide-react";
import { toCsv, downloadCsv, fmtDay, stamp } from "@/utils/csv";
import { useQuery } from "@tanstack/react-query";
import { listOrders, listCustomers, type OrderDoc } from "@services/orders.service";
import { formatCOP } from "@/utils/money";
import { formatDate } from "@/utils/date";
import ResponsiveRows from "@/components/common/ResponsiveRows";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import StatusPill, { type PillTone } from "@/components/ui/StatusPill";

const money = (n?: number) => formatCOP(n, { code: true });

const STATUS: Record<OrderDoc["status"], { label: string; tone: PillTone }> = {
  created: { label: "Creado", tone: "mid" },
  payment_processing: { label: "Procesando pago", tone: "mid" },
  partial: { label: "Abono / fiado", tone: "warn" },
  paid: { label: "Pagado", tone: "ok" },
  failed: { label: "Fallido", tone: "bad" },
  canceled: { label: "Cancelado", tone: "mid" },
  refunded: { label: "Reembolsado", tone: "mid" },
};

export default function OrdersPage() {
  const [status, setStatus] = React.useState<OrderDoc["status"] | "">("");
  const [q, setQ] = React.useState("");

  const { data: orders = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["orders", "list", status],
    queryFn: () => listOrders(status ? { status } : undefined),
    staleTime: 30_000,
  });

  // ponytail: filtro de texto en cliente; mover al backend si las órdenes pasan de unos miles.
  const needle = q.trim().toLowerCase();
  const rows = needle
    ? orders.filter((o) =>
        [o.buyer?.name, o.buyer?.email, o.buyer?.phone, ...(o.items || []).map((it: any) => it.title)]
          .some((v) => String(v || "").toLowerCase().includes(needle)))
    : orders;

  const [exporting, setExporting] = React.useState(false);
  const exportBuyers = async () => {
    setExporting(true);
    try {
      const customers = await listCustomers();
      downloadCsv(`compradores_${stamp()}.csv`, toCsv(customers, [
        { header: "Nombre", value: (c) => c.name },
        { header: "Email", value: (c) => c.email },
        { header: "Teléfono", value: (c) => c.phone, text: true },
        { header: "Dirección", value: (c) => [c.address?.line1, c.address?.line2].filter(Boolean).join(", ") },
        { header: "Compras", value: (c) => c.ordersCount ?? 0 },
        { header: "Total gastado (COP)", value: (c) => c.totalSpent ?? 0 },
        { header: "Primera compra", value: (c) => fmtDay(c.firstOrderAt) },
        { header: "Última compra", value: (c) => fmtDay(c.lastOrderAt) },
      ]));
    } finally {
      setExporting(false);
    }
  };

  const paidRows = rows.filter((o) => o.status === "paid");
  const paidTotal = paidRows.reduce((a, o) => a + Number(o.total || 0), 0);
  const pendingTotal = rows
    .filter((o) => o.status === "partial")
    .reduce((a, o) => a + Number(o.total || 0), 0);
  const items = (o: OrderDoc) => (o.items || []).map((it: any) => it.title || it.artworkId).join(", ");
  const chip = (s: OrderDoc["status"]) => (
    <StatusPill label={STATUS[s]?.label || s} tone={STATUS[s]?.tone || "mid"} />
  );

  return (
    <Box>
      <PageHeader
        crumb="Pedidos"
        title="Listado de pedidos"
        description="Todas las ventas de obras, en línea y en caja."
        actions={[
          { label: "Crear pedido", kind: "pri", icon: <Plus size={14} />, href: "/orders/new" },
          {
            label: exporting ? "Exportando…" : "Exportar compradores",
            kind: "sec",
            icon: <FileSpreadsheet size={14} />,
            disabled: exporting,
            onClick: exportBuyers,
          },
          {
            label: "Actualizar",
            kind: "sec",
            icon: <RefreshCw size={14} />,
            disabled: isFetching,
            onClick: () => refetch(),
          },
        ]}
      />

      <KpiStrip
        loading={isLoading}
        items={[
          { label: "Pedidos", value: rows.length },
          { label: "Pagados", value: paidRows.length },
          { label: "En cartera", value: money(pendingTotal) },
          { label: "Total pagado", value: money(paidTotal), accent: true },
        ]}
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
        <TextField size="small" label="Buscar comprador u obra" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1 }} />
        <TextField size="small" select label="Estado" value={status} onChange={(e) => setStatus(e.target.value as any)} sx={{ minWidth: 200 }}>
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(STATUS).map(([v, s]) => <MenuItem key={v} value={v}>{s.label}</MenuItem>)}
        </TextField>
      </Stack>

      <Card>
        {isFetching && <LinearProgress />}
        <CardContent>
          {isLoading ? (
            <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>
          ) : (
            <ResponsiveRows
              emptyText="No hay pedidos con estos filtros."
              cards={rows.map((o) => ({
                id: String(o.id),
                title: o.buyer?.name || "—",
                subtitle: o.buyer?.email || o.buyer?.phone || "",
                badge: chip(o.status),
                fields: [
                  { label: "Obras", value: items(o) },
                  { label: "Total", value: money(o.total) },
                  { label: "Método", value: o.payment?.method || "—" },
                  { label: "Fecha", value: formatDate(o.createdAt) },
                ],
              }))}
            >
              <TableContainer component={Paper} elevation={0}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Comprador</TableCell>
                      <TableCell>Obras</TableCell>
                      <TableCell>Método</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow><TableCell colSpan={6} align="center" sx={{ color: "text.secondary", py: 3 }}>No hay pedidos con estos filtros.</TableCell></TableRow>
                    ) : rows.map((o) => (
                      <TableRow key={o.id} hover>
                        <TableCell>{formatDate(o.createdAt)}</TableCell>
                        <TableCell>
                          <Typography fontWeight={500} fontSize={13}>{o.buyer?.name || "—"}</Typography>
                          <Typography variant="caption" color="text.secondary">{o.buyer?.email || o.buyer?.phone || ""}</Typography>
                        </TableCell>
                        <TableCell><Typography variant="caption">{items(o)}</Typography></TableCell>
                        <TableCell>{o.payment?.method || "—"}</TableCell>
                        <TableCell align="right">{money(o.total)}</TableCell>
                        <TableCell>{chip(o.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </ResponsiveRows>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
