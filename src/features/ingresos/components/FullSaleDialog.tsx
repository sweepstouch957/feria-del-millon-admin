"use client";

import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { eyebrow } from "@/app/theme";
import { getInventoryStatus } from "@services/applications.service";
import { getTicketDays } from "@services/ticket.service";
import { formatCOP } from "@/utils/money";
import { fullSaleProjection } from "../model/fairHistory";

const money = (v: number) => formatCOP(v, { code: true });

function Line({ label, value, sub, strong }: { label: string; value: number; sub?: string; strong?: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "baseline", gap: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: strong ? 600 : 400 }}>{label}</Typography>
        {sub && <Typography variant="body2" color="text.secondary">{sub}</Typography>}
      </Box>
      <Typography sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", fontWeight: strong ? 600 : 400, color: strong ? "primary.main" : undefined }}>
        {money(value)}
      </Typography>
    </Box>
  );
}

/** "¿Y si vendemos todo?": lo cobrado hoy + todo el inventario que queda + las entradas libres. */
export function FullSaleDialog({
  open,
  onClose,
  eventId,
  year,
  collected,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  year: string;
  collected: { artworks: number; applications: number; tickets: number };
}) {
  // Solo se piden al abrir: recorren todo el inventario de la feria.
  const stockQ = useQuery({ queryKey: ["fullSale", "stock", eventId], queryFn: () => getInventoryStatus(eventId), enabled: open, staleTime: 60_000 });
  const daysQ = useQuery({ queryKey: ["ticketDays", eventId], queryFn: () => getTicketDays(eventId), enabled: open });

  const rows = stockQ.data ?? [];
  const stockValue = rows.reduce((s, r) => s + (r.value || 0), 0);
  const copies = rows.reduce((s, r) => s + r.copies, 0);
  const days = daysQ.data?.days ?? [];
  const ticketsLeft = days.reduce((s, d) => s + Math.max(0, d.remaining || 0) * (d.price || 0), 0);
  const seatsLeft = days.reduce((s, d) => s + Math.max(0, d.remaining || 0), 0);
  const p = fullSaleProjection({ collected, stockValue, ticketsLeft });
  const loading = stockQ.isLoading || daysQ.isLoading;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="full-sale-title">
      <DialogTitle id="full-sale-title">¿Y si vendemos todo en {year}?</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress aria-label="Calculando" /></Stack>
        ) : stockQ.isError || daysQ.isError ? (
          <Alert severity="error">No se pudo calcular. Cierra y vuelve a intentar.</Alert>
        ) : (
          <>
            <Typography sx={{ ...eyebrow, fontSize: 10, color: "text.secondary" }}>Cobrado hasta hoy</Typography>
            <Line label="Obras vendidas" value={collected.artworks} />
            <Line label="Inscripciones" value={collected.applications} />
            <Line label="Boletos" value={collected.tickets} />
            <Line label="Total hoy" value={p.today} strong />

            <Typography sx={{ ...eyebrow, fontSize: 10, color: "text.secondary", mt: 3 }}>Lo que falta por vender</Typography>
            <Line
              label="Todas las obras que quedan"
              value={stockValue}
              sub={`${copies.toLocaleString("es-CO")} copias disponibles, al precio de cada obra`}
            />
            <Line
              label="Si se venden todas las obras"
              value={p.ifArtworksSell}
              strong
            />
            <Line
              label="Entradas libres"
              value={ticketsLeft}
              sub={`${seatsLeft.toLocaleString("es-CO")} cupos al precio de cada día`}
            />
            <Line label="Si además se llena la feria" value={p.ifEverythingSells} strong />

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, lineHeight: 1.6 }}>
              Es un techo, no una meta: supone vender cada copia al precio publicado, sin descuentos, y agotar el cupo de
              cada día. Los cupos que ya ocupan las invitaciones no se cuentan como venta. Las inscripciones no suben: la
              convocatoria ya cerró.
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
