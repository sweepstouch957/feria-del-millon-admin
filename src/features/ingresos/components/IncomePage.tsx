"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { Download, RefreshCw } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import { eyebrow } from "@/app/theme";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import type { ArtistApplication } from "@services/applications.service";
import type { OrderDoc } from "@services/orders.service";
import { TICKET_TYPE_LABEL, type TicketSale } from "@services/ticket.service";
import { downloadCsv, stamp, toCsv, type CsvCol } from "@/utils/csv";
import { formatCOP } from "@/utils/money";
import { useIncome } from "../hooks/useIncome";
import { appAmount, byMethod, groupTotals, methodLabel, orderIncome, type Customer, type MethodTotal } from "../model/income";

const money = (n?: number) => formatCOP(n || 0, { code: true });
const when = (d?: string) => (d ? new Date(d).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" }) : "");
const day = (d?: string) => (d ? new Date(d).toLocaleDateString("es-CO", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }) : "");

const artistOf = (a: any) => (typeof a.artist === "object" ? a.artist : {}) || {};

const TICKET_COLS: CsvCol<TicketSale>[] = [
  { header: "Fecha de compra", value: (t) => when(t.createdAt) },
  { header: "Comprador", value: (t) => t.buyer?.name },
  { header: "Entrada", value: (t) => TICKET_TYPE_LABEL[t.type] || t.type },
  { header: "Tipo de pago", value: (t) => methodLabel(t.paymentMethod) },
  { header: "Vendió", value: (t) => t.sellerName || "En línea" },
  { header: "Valor", value: (t) => t.price || 0 },
  { header: "Correo", value: (t) => t.buyer?.email },
  { header: "Teléfono", value: (t) => t.buyer?.phone, text: true },
  { header: "Documento", value: (t) => t.buyer?.documentNumber, text: true },
  { header: "Ciudad", value: (t) => t.buyer?.city },
  { header: "Empresa", value: (t) => t.buyer?.company },
  { header: "NIT", value: (t) => t.buyer?.nit, text: true },
  { header: "Día", value: (t) => (t.allDays ? "Todos" : t.anyDay ? "Un día a elección" : day(t.eventDay)) },
  { header: "Código", value: (t) => t.shortCode, text: true },
  { header: "Viene de", value: (t) => t.linkLabel },
  { header: "Estado", value: (t) => (t.status === "checked_in" ? "Ya entró" : "Vendida") },
];
const ORDER_COLS: CsvCol<OrderDoc>[] = [
  { header: "Fecha", value: (o) => when(o.paidAt || o.createdAt) },
  { header: "Comprador", value: (o) => o.buyer?.name },
  { header: "Obras", value: (o) => o.items?.map((i) => i.title).filter(Boolean).join(", ") },
  { header: "Tipo de pago", value: (o) => (o.status === "partial" ? "Apartada" : methodLabel(o.payment?.method)) },
  { header: "Cajera", value: (o) => o.cashierName || o.invoice?.issuedBy || "En línea" },
  { header: "Recibido", value: (o) => orderIncome(o) },
  { header: "Correo", value: (o) => o.buyer?.email },
  { header: "Teléfono", value: (o) => o.buyer?.phone, text: true },
  { header: "Documento", value: (o) => o.buyer?.document, text: true },
  { header: "Dirección", value: (o) => o.buyer?.address?.line1 },
  { header: "Ciudad", value: (o) => o.cityName },
  { header: "Artistas", value: (o) => [...new Set(o.items?.map((i) => i.artistName).filter(Boolean))].join(", ") },
  { header: "Total de la orden", value: (o) => o.total || 0 },
  { header: "Saldo", value: (o) => (o.status === "partial" ? o.layaway?.balanceDue || 0 : 0) },
];
const APP_COLS: CsvCol<ArtistApplication>[] = [
  { header: "Fecha de pago", value: (a) => when(a.paidAt) },
  { header: "Artista", value: (a) => [artistOf(a).firstName, artistOf(a).lastName].filter(Boolean).join(" ") },
  { header: "Correo", value: (a) => artistOf(a).email },
  { header: "Celular", value: (a) => artistOf(a).mobile, text: true },
  { header: "Ciudad", value: (a) => artistOf(a).city },
  { header: "Convocatoria", value: (a) => (a.convocatoria as any)?.name },
  { header: "Estado", value: (a) => a.status },
  { header: "Valor", value: appAmount },
];
const CUSTOMER_COLS: CsvCol<Customer>[] = [
  { header: "Nombre", value: (c) => c.name },
  { header: "Correo", value: (c) => c.email },
  { header: "Teléfono", value: (c) => c.phone, text: true },
  { header: "Documento", value: (c) => c.document, text: true },
  { header: "Dirección", value: (c) => c.address },
  { header: "Ciudad", value: (c) => c.city },
  { header: "Empresa", value: (c) => c.company },
  { header: "Entradas", value: (c) => c.tickets },
  { header: "En entradas", value: (c) => c.ticketsAmount },
  { header: "Obras compradas", value: (c) => c.orders },
  { header: "En obras", value: (c) => c.ordersAmount },
  { header: "Total", value: (c) => c.ticketsAmount + c.ordersAmount },
];

const PANELS = ["boletos", "obras", "inscripciones", "clientes"] as const;
type Panel = (typeof PANELS)[number];

/** Una franja de totales con su título: "Por tipo de pago", "Por cajera"… */
function Breakdown({ title, items, unit }: { title: string; items: MethodTotal[]; unit: string }) {
  if (!items.length) return null;
  return (
    <Box>
      <Typography sx={{ ...eyebrow, fontSize: 10, color: "text.secondary", mb: 1 }}>{title}</Typography>
      <KpiStrip items={items.map((m) => ({ label: m.label, value: money(m.amount), sub: `${m.count} ${unit}` }))} />
    </Box>
  );
}
const MONEY_HEADERS = new Set(["Valor", "Total de la orden", "Recibido", "Saldo", "En entradas", "En obras", "Total"]);
const SHOW = (h: string, v: unknown) => (MONEY_HEADERS.has(h) ? money(Number(v)) : String(v ?? "") || "—");

function Rows<T>({ rows, cols, name, screen, screenLabel }: { rows: T[]; cols: CsvCol<T>[]; name: string; screen?: string; screenLabel?: string }) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(100);
  const [open, setOpen] = useState<T | null>(null);
  const needle = q.trim().toLowerCase();
  const filtered = needle ? rows.filter((r) => cols.some((c) => String(c.value(r) ?? "").toLowerCase().includes(needle))) : rows;
  const preview = cols.slice(0, 7);

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ sm: "center" }} sx={{ mb: 1.5 }}>
        <TextField size="small" placeholder="Buscar en esta lista" value={q} onChange={(e) => { setQ(e.target.value); setShown(100); }} sx={{ flex: 1, maxWidth: 420 }} />
        <Button variant="outlined" startIcon={<Download size={15} />} disabled={!rows.length} onClick={() => downloadCsv(`${name}_${stamp()}.csv`, toCsv(filtered, cols))}>
          Descargar Excel
        </Button>
        {screen && <Button href={screen}>{screenLabel}</Button>}
      </Stack>
      {filtered.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>Todavía no hay nada aquí.</Typography>
      ) : (
        <TableContainer sx={{ border: "1px solid", borderColor: "divider" }}>
          <Table size="small">
            <TableHead>
              <TableRow>{preview.map((c) => <TableCell key={c.header} sx={{ whiteSpace: "nowrap" }}>{c.header}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {filtered.slice(0, shown).map((r, i) => (
                <TableRow key={i} hover onClick={() => setOpen(r)} sx={{ cursor: "pointer" }}>
                  {preview.map((c) => <TableCell key={c.header}>{SHOW(c.header, c.value(r))}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {filtered.length > shown && (
        <Box sx={{ textAlign: "center", mt: 1.5 }}>
          <Button onClick={() => setShown((s) => s + 100)}>Ver más ({filtered.length - shown})</Button>
        </Box>
      )}

      <Dialog open={!!open} onClose={() => setOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Detalle</DialogTitle>
        <DialogContent dividers>
          {open && (
            <Stack gap={1.25}>
              {cols.map((c) => (
                <Box key={c.header}>
                  <Typography sx={{ ...eyebrow, fontSize: 9.5, color: "text.secondary" }}>{c.header}</Typography>
                  <Typography sx={{ wordBreak: "break-word" }}>{SHOW(c.header, c.value(open))}</Typography>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(null)}>Cerrar</Button>
          {screen && <Button variant="contained" href={screen}>{screenLabel}</Button>}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export function IncomePage({ initialPanel }: { initialPanel?: string }) {
  const { eventId, isLoading, isError, refetch } = useActiveEvent();
  if (!eventId) return <ActiveEventGate isLoading={isLoading} isError={isError} onRetry={refetch} />;
  return <Income eventId={eventId} initialPanel={initialPanel} />;
}

/** Cuánta plata ha generado la feria y de quién: boletos, obras e inscripciones. */
function Income({ eventId, initialPanel }: { eventId: string; initialPanel?: string }) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(PANELS.find((p) => p === initialPanel) ?? "boletos");
  const { tickets, orders, apps, customers, ticketsTotal, ordersTotal, appsTotal, total, pending, applications, loading, failed, refetch } = useIncome(eventId);
  const ticketAmount = (t: TicketSale) => Number(t.price || 0);

  return (
    <Box>
      <PageHeader
        crumb="Reportes"
        title="Reportes"
        description="Toda la plata de la feria. Toca una cifra para ver su detalle y una fila para ver toda la información."
        actions={[
          { label: "Informe de ventas", kind: "sec", href: "/reportes/ventas" },
          { label: "Actualizar", kind: "sec", icon: <RefreshCw size={14} />, onClick: refetch },
        ]}
      />
      {failed && <Alert severity="error" sx={{ mb: 2 }}>Una parte del reporte no cargó: las cifras pueden estar incompletas. Pulsa Actualizar.</Alert>}

      <KpiStrip
        loading={loading}
        items={[
          { label: "Total", value: money(total), accent: true, sub: "boletos + obras + inscripciones" },
          { label: "Boletos", value: money(ticketsTotal), sub: `${tickets.length} entrada(s)`, onClick: () => setPanel("boletos"), selected: panel === "boletos" },
          { label: "Obras", value: money(ordersTotal), sub: `${orders.length} venta(s)`, onClick: () => setPanel("obras"), selected: panel === "obras" },
          { label: "Inscripciones", value: money(appsTotal), sub: `${apps.length} pagada(s)`, onClick: () => setPanel("inscripciones"), selected: panel === "inscripciones" },
          { label: "Clientes", value: customers.length, sub: "compraron entradas u obras", onClick: () => setPanel("clientes"), selected: panel === "clientes" },
          { label: "Por cobrar", value: money(pending), sub: "saldo de obras apartadas", onClick: () => router.push("/orders/cartera") },
          { label: "Solicitudes", value: applications.total, sub: `${applications.accepted} aceptadas`, onClick: () => router.push("/solicitudes") },
        ]}
      />

      {panel === "boletos" && (
        <>
          <Breakdown title="Por tipo de pago" unit="entrada(s)" items={byMethod(tickets, (t) => t.paymentMethod, ticketAmount)} />
          <Breakdown title="Por tipo de entrada" unit="entrada(s)" items={groupTotals(tickets, (t) => TICKET_TYPE_LABEL[t.type] || t.type, ticketAmount)} />
          <Breakdown title="Por quién vendió" unit="entrada(s)" items={groupTotals(tickets, (t) => t.sellerName || "En línea", ticketAmount)} />
        </>
      )}
      {panel === "obras" && (
        <>
          <Breakdown title="Por tipo de pago" unit="venta(s)" items={byMethod(orders, (o) => (o.status === "partial" ? "Apartadas (abonos)" : o.payment?.method), orderIncome)} />
          <Breakdown title="Por cajera" unit="venta(s)" items={groupTotals(orders, (o) => o.cashierName || o.invoice?.issuedBy || "En línea", orderIncome)} />
        </>
      )}
      {panel === "inscripciones" && (
        <Breakdown title="Por convocatoria" unit="pagada(s)" items={groupTotals(apps, (a) => (a.convocatoria as { name?: string })?.name || "Sin convocatoria", appAmount)} />
      )}

      {loading ? (
        <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Box>
      ) : panel === "boletos" ? (
        <Rows key="boletos" rows={tickets} cols={TICKET_COLS} name="boletos" screen="/tickets/asistentes" screenLabel="Abrir asistentes" />
      ) : panel === "obras" ? (
        <Rows key="obras" rows={orders} cols={ORDER_COLS} name="ventas_obras" screen="/orders" screenLabel="Abrir órdenes" />
      ) : panel === "inscripciones" ? (
        <Rows key="inscripciones" rows={apps} cols={APP_COLS} name="inscripciones" screen="/solicitudes" screenLabel="Abrir solicitudes" />
      ) : (
        <Rows key="clientes" rows={customers} cols={CUSTOMER_COLS} name="clientes" />
      )}
    </Box>
  );
}
