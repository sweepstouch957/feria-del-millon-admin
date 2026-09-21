"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, Chip, Button, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
  CircularProgress, LinearProgress,
} from "@mui/material";
import { ShoppingBag, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listOrders, type OrderDoc } from "@services/orders.service";
import { formatCOP } from "@/utils/money";
import { formatDate } from "@/utils/date";
import ResponsiveRows from "@/components/common/ResponsiveRows";

const money = (n?: number) => formatCOP(n, { code: true });

const STATUS: Record<OrderDoc["status"], { label: string; color: "default" | "success" | "warning" | "error" | "info" }> = {
  created: { label: "Creado", color: "default" },
  payment_processing: { label: "Procesando pago", color: "info" },
  partial: { label: "Abono / fiado", color: "warning" },
  paid: { label: "Pagado", color: "success" },
  failed: { label: "Fallido", color: "error" },
  canceled: { label: "Cancelado", color: "default" },
  refunded: { label: "Reembolsado", color: "default" },
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

  const paidTotal = rows.filter((o) => o.status === "paid").reduce((a, o) => a + Number(o.total || 0), 0);
  const items = (o: OrderDoc) => (o.items || []).map((it: any) => it.title || it.artworkId).join(", ");
  const chip = (s: OrderDoc["status"]) => (
    <Chip size="small" label={STATUS[s]?.label || s} color={STATUS[s]?.color || "default"} />
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Stack direction="row" flexWrap="wrap" alignItems="center" spacing={1.5} mb={3}>
        <Box sx={{ width: 40, height: 40, bgcolor: "rgba(63,164,110,0.14)", color: "#3FA46E", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ShoppingBag size={20} />
        </Box>
        <Box flex={1}>
          <Typography fontWeight={500} fontSize={20}>Pedidos</Typography>
          <Typography variant="caption" color="text.secondary">Todas las ventas de obras, en línea y en caja.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => refetch()} disabled={isFetching} sx={{ textTransform: "none" }}>
          Actualizar
        </Button>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
        <TextField size="small" label="Buscar comprador u obra" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1 }} />
        <TextField size="small" select label="Estado" value={status} onChange={(e) => setStatus(e.target.value as any)} sx={{ minWidth: 200 }}>
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(STATUS).map(([v, s]) => <MenuItem key={v} value={v}>{s.label}</MenuItem>)}
        </TextField>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
        <Card sx={{ borderRadius: 0, flex: 1 }}><CardContent>
          <Typography variant="caption" color="text.secondary">Pedidos</Typography>
          <Typography fontWeight={500} fontSize={26}>{rows.length}</Typography>
        </CardContent></Card>
        <Card sx={{ borderRadius: 0, flex: 1 }}><CardContent>
          <Typography variant="caption" color="text.secondary">Total pagado</Typography>
          <Typography fontWeight={500} fontSize={26} color="#3FA46E">{money(paidTotal)}</Typography>
        </CardContent></Card>
      </Stack>

      <Card sx={{ borderRadius: 0 }}>
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
