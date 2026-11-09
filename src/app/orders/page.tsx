"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
  CircularProgress, LinearProgress, IconButton, Tooltip, Button, TablePagination,
} from "@mui/material";
import { RefreshCw, FileSpreadsheet, Plus, Eye, Mail, ExternalLink } from "lucide-react";
import { SHOP_URL } from "@core/constants";
import { DeliveryConfirmDialog } from "./DeliveryConfirmDialog";
import { toCsv, downloadCsv, fmtDay, stamp } from "@/utils/csv";
import LockedNotice from "@/components/ui/LockedNotice";
import { SALES_DETAIL_ENABLED } from "@/utils/exportsLock";
import { useQuery } from "@tanstack/react-query";
import { listOrders, listCustomers, type OrderDoc } from "@services/orders.service";
import { formatCOP } from "@/utils/money";
import { formatDate } from "@/utils/date";
import ResponsiveRows from "@/components/common/ResponsiveRows";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import StatusPill from "@/components/ui/StatusPill";
import { RefundButton } from "@features/caja/components/RefundButton";
import { methodLabel } from "@features/ingresos/model/income";
import { getInventoryStatus } from "@services/applications.service";
import { useActiveEvent } from "@hooks/events/useActiveEvent";
import { OrderDetailDialog, STATUS } from "./OrderDetailDialog";

const money = (n?: number) => formatCOP(n, { code: true });
// Foto de la transferencia: en el pago (venta completa) o en el último abono que la trajo.
const receiptOf = (o: OrderDoc): string | undefined =>
  o.payment?.details?.receiptUrl ||
  [...(o.layaway?.installments ?? [])].reverse().find((i) => i.receiptUrl)?.receiptUrl;

export default function Page() {
  return SALES_DETAIL_ENABLED ? <OrdersPage /> : <LockedNotice title="Órdenes" />;
}

function OrdersPage() {
  const [status, setStatus] = React.useState<OrderDoc["status"] | "">("");
  const [q, setQ] = React.useState("");
  const [detail, setDetail] = React.useState<OrderDoc | null>(null);
  const [mailOpen, setMailOpen] = React.useState(false);

  const { data: orders = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["orders", "list", status],
    queryFn: () => listOrders(status ? { status } : undefined),
    staleTime: 30_000,
    // Durante la feria el panel queda abierto: un pago rechazado o un error de
    // stock tiene que verse sin recargar.
    refetchInterval: 60_000,
  });

  // Avance del inventario: copias que quedan (inventory-status) vs. vendidas
  // (pagadas + apartadas, que ya descontaron stock) en la feria activa.
  const { eventId } = useActiveEvent();
  const stockQ = useQuery({
    queryKey: ["orders", "stock", eventId],
    queryFn: () => getInventoryStatus(eventId!),
    enabled: !!eventId,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  const allQ = useQuery({
    queryKey: ["orders", "list", ""],
    queryFn: () => listOrders(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const available = (stockQ.data ?? []).reduce((s, r) => s + (r.copies || 0), 0);
  const sold = (allQ.data ?? [])
    .filter((o) => (o.status === "paid" || o.status === "partial") && (!eventId || String((o.event as any)?._id ?? o.event) === String(eventId)))
    .reduce((s, o) => s + (o.items || []).reduce((a, it) => a + Number(it.qty || 1), 0), 0);
  const soldPct = sold + available ? Math.round((sold / (sold + available)) * 100) : 0;

  // ponytail: filtro de texto en cliente; mover al backend si las órdenes pasan de unos miles.
  const needle = q.trim().toLowerCase();
  const rows = needle
    ? orders.filter((o) =>
        [o.buyer?.name, o.buyer?.email, o.buyer?.phone, o.buyer?.document, ...(o.items || []).flatMap((it) => [it.title, it.artistName])]
          .some((v) => String(v || "").toLowerCase().includes(needle)))
    : orders;

  // ponytail: paginación en cliente (el back devuelve todo); pasar a skip/limit en GET /orders tras la feria.
  const [page, setPage] = React.useState(0);
  const [perPage, setPerPage] = React.useState(50);
  React.useEffect(() => setPage(0), [needle, status]);
  const pageRows = rows.slice(page * perPage, page * perPage + perPage);

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
  // Cada obra abre su página de la tienda en otra pestaña (reintentar la compra o mandar el link).
  const itemLinks = (o: OrderDoc) => (o.items || []).map((it, i) => (
    <React.Fragment key={i}>
      {i > 0 && ", "}
      <a href={`${SHOP_URL.replace(/\/+$/, "")}/obra/${it.artworkId}`} target="_blank" rel="noreferrer"
        title="Abrir la obra en la tienda" onClick={(e) => e.stopPropagation()}
        style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}>
        {it.title || it.artworkId}<ExternalLink size={11} style={{ marginLeft: 3, verticalAlign: "-1px" }} />
      </a>
      {it.artistName ? ` — ${it.artistName}` : ""}
    </React.Fragment>
  ));
  // Apartados: aún no hay pago, así que la cajera y el método salen del primer abono
  // (antes caían en "En línea" aunque los registró la caja).
  const firstAbono = (o: OrderDoc) => o.layaway?.enabled ? o.layaway.installments?.[0] : undefined;
  const cashierOf = (o: OrderDoc) =>
    o.cashierName || o.invoice?.issuedBy || firstAbono(o)?.byName || (o.layaway?.enabled ? "Caja" : "En línea");
  const payOf = (o: OrderDoc) => {
    if (o.payment?.method) return methodLabel(o.payment.method);
    const ab = firstAbono(o);
    return ab ? `Abono${ab.method ? ` · ${methodLabel(ab.method)}` : ""}` : "—";
  };
  const place = (o: OrderDoc) => [o.cityName, o.buyer?.address?.line1].filter(Boolean).join(" · ");
  const eye = (o: OrderDoc) => (
    <Tooltip title="Ver todo el detalle">
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDetail(o); }}><Eye size={16} /></IconButton>
    </Tooltip>
  );
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
          { label: "Vender obra", kind: "pri", icon: <Plus size={14} />, href: "/caja" },
          { label: "Correo de dirección", kind: "sec", icon: <Mail size={14} />, onClick: () => setMailOpen(true) },
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
          { label: "Rechazados", value: rows.filter((o) => o.status === "failed").length },
          { label: "En cartera", value: money(pendingTotal) },
          { label: "Total pagado", value: money(paidTotal), accent: true },
        ]}
      />
      <KpiStrip
        loading={stockQ.isLoading || allQ.isLoading}
        items={[
          { label: "Obras vendidas", value: sold.toLocaleString("es-CO"), sub: "copias pagadas o apartadas", accent: true },
          { label: "Disponibles", value: available.toLocaleString("es-CO"), sub: `faltan ${available.toLocaleString("es-CO")} para agotar` },
          { label: "Avance", value: `${soldPct} %`, sub: `${sold.toLocaleString("es-CO")} de ${(sold + available).toLocaleString("es-CO")} copias` },
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
              cards={pageRows.map((o) => ({
                id: String(o.id),
                title: o.buyer?.name || "—",
                subtitle: o.buyer?.email || o.buyer?.phone || "",
                badge: chip(o.status),
                fields: [
                  ...(o.buyer?.phone && o.buyer?.email ? [{ label: "Teléfono", value: o.buyer.phone }] : []),
                  ...(o.buyer?.document ? [{ label: "Documento", value: o.buyer.document }] : []),
                  ...(place(o) ? [{ label: "Dirección", value: place(o) }] : []),
                  { label: "Obras", value: itemLinks(o) },
                  { label: "Total", value: money(o.total) },
                  { label: "Tipo de pago", value: payOf(o) },
                  { label: "Cajera", value: cashierOf(o) },
                  { label: "Fecha", value: formatDate(o.createdAt) },
                  ...(o.fulfillmentError ? [{ label: "Stock", value: `Pagada sin descontar stock: ${o.fulfillmentError}` }] : []),
                  ...(receiptOf(o) ? [{ label: "Comprobante", value: <a href={receiptOf(o)} target="_blank" rel="noreferrer">Ver foto</a> }] : []),
                ],
                actions: <><Button size="small" startIcon={<Eye size={14} />} onClick={() => setDetail(o)}>Ver detalle</Button><RefundButton order={o} /></>,
              }))}
            >
              <TableContainer component={Paper} elevation={0}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Comprador</TableCell>
                      <TableCell>Obras</TableCell>
                      <TableCell>Tipo de pago</TableCell>
                      <TableCell>Cajera</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow><TableCell colSpan={8} align="center" sx={{ color: "text.secondary", py: 3 }}>No hay pedidos con estos filtros.</TableCell></TableRow>
                    ) : pageRows.map((o) => (
                      <TableRow key={o.id} hover onClick={() => setDetail(o)} sx={{ cursor: "pointer" }}>
                        <TableCell>{formatDate(o.createdAt)}</TableCell>
                        <TableCell>
                          <Typography fontWeight={500} fontSize={13}>{o.buyer?.name || "—"}</Typography>
                          {[o.buyer?.email, o.buyer?.phone, o.buyer?.document && `Doc. ${o.buyer.document}`, place(o)]
                            .filter(Boolean)
                            .map((v) => <Typography key={v} variant="caption" color="text.secondary" display="block">{v}</Typography>)}
                        </TableCell>
                        <TableCell><Typography variant="caption">{itemLinks(o)}</Typography></TableCell>
                        <TableCell>
                          {payOf(o)}
                          {receiptOf(o) && (
                            <Typography component="a" href={receiptOf(o)} target="_blank" rel="noreferrer" variant="caption" display="block" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                              Comprobante
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{cashierOf(o)}</TableCell>
                        <TableCell align="right">{money(o.total)}</TableCell>
                        <TableCell>
                          {chip(o.status)}
                          {o.fulfillmentError && (
                            <Typography variant="caption" color="error" display="block">Pagada sin descontar stock: {o.fulfillmentError}</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: "nowrap" }}>
                          {eye(o)}
                          <RefundButton order={o} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </ResponsiveRows>
          )}
          {!isLoading && rows.length > 0 && (
            <TablePagination
              component="div"
              count={rows.length}
              page={Math.min(page, Math.max(0, Math.ceil(rows.length / perPage) - 1))}
              onPageChange={(_, p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              rowsPerPage={perPage}
              onRowsPerPageChange={(e) => { setPerPage(Number(e.target.value)); setPage(0); }}
              rowsPerPageOptions={[25, 50, 100, 200]}
              labelRowsPerPage="Por página"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            />
          )}
        </CardContent>
      </Card>
      <OrderDetailDialog order={detail} all={orders} onClose={() => setDetail(null)} />
      <DeliveryConfirmDialog open={mailOpen} onClose={() => setMailOpen(false)} />
    </Box>
  );
}
