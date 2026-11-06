"use client";

import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { toast } from "sonner";
import { claimOrderStock, createOrder, markOrderPaid } from "@services/orders.service";
import { CAJA_METHODS, type CajaMethod } from "@/features/caja/model/sale";
import { useAuth } from "@/provider/authProvider";
import { formatCOP } from "@/utils/money";

/**
 * Venta en lote: varias obras, un comprador, un pago. Misma secuencia que la
 * caja (crear orden → tomar stock → marcar pagada), pero con todos los items
 * en una sola orden. El precio por obra lo valida el servidor (menor al de la
 * obra solo con "quién autorizó").
 */
export default function BulkSaleDialog({
  open,
  onClose,
  onDone,
  eventId,
  artworks,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  eventId: string;
  artworks: any[];
}) {
  const { user } = useAuth();
  const [f, setF] = useState({ name: "", email: "", phone: "", document: "", address: "", price: "", method: "whatsapp" as CajaMethod, note: "", receipt: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: any) => setF((s) => ({ ...s, [k]: e.target.value }));

  const unit = Number(f.price.replace(/\D/g, "")) || 0;
  const total = unit ? unit * artworks.length : artworks.reduce((s, a) => s + Number(a.price || 0), 0);
  const discounted = unit > 0 && artworks.some((a) => unit < Number(a.price));
  const tooHigh = unit > 0 && artworks.some((a) => unit > Number(a.price));
  const invalid =
    !artworks.length || f.name.trim().length < 3 || !/^\S+@\S+\.\S+$/.test(f.email.trim()) || f.phone.trim().length < 7 ||
    tooHigh || (discounted && f.note.trim().length < 3);

  const submit = async () => {
    setBusy(true);
    try {
      const order = await createOrder({
        event: eventId,
        items: artworks.map((a) => ({
          artworkId: String(a.id ?? a._id),
          artistId: String(a.artist?._id ?? a.artist ?? ""),
          qty: 1,
          unitPrice: unit || Number(a.price),
          currency: a.currency ?? "COP",
        })),
        discountNote: discounted ? f.note.trim() : undefined,
        buyer: { name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), document: f.document.trim() || undefined },
        userId: user?.id,
      });
      // El servidor rehace el total; si el descuento no pasó, no se cobra a ciegas.
      if (order.total !== total) throw new Error(`El servidor calculó ${formatCOP(order.total)} y no ${formatCOP(total)}. No se cobró.`);
      await claimOrderStock(order.id);
      const cashier = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Panel";
      const paid = await markOrderPaid(order.id, {
        method: f.method,
        amount: order.total,
        details: {
          cashierId: user?.id,
          receiptUrl: f.receipt.trim() || undefined,
          notes: [f.address.trim() && `Entrega: ${f.address.trim()}`, "Venta en lote desde el panel"].filter(Boolean).join(" · "),
        },
        invoice: { channel: "event_pos", issuedBy: cashier },
      });
      if (paid.fulfillmentError) toast.warning(`Pagada, pero revisar stock: ${paid.fulfillmentError}`);
      toast.success(`${artworks.length} obras vendidas por ${formatCOP(order.total)}`);
      onDone();
    } catch (e: any) {
      const code = e?.response?.data?.error;
      toast.error(code === "sin_stock" ? "Alguna obra ya estaba vendida. No se cobró nada." : code || e?.message || "No se pudo registrar la venta.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Vender {artworks.length} {artworks.length === 1 ? "obra" : "obras"} juntas</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <TextField label="Nombre del comprador" value={f.name} onChange={set("name")} size="small" required />
          <Stack direction="row" spacing={1.5}>
            <TextField label="Correo" value={f.email} onChange={set("email")} size="small" required fullWidth />
            <TextField label="Teléfono" value={f.phone} onChange={set("phone")} size="small" required fullWidth />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField label="Cédula / NIT" value={f.document} onChange={set("document")} size="small" fullWidth />
            <TextField label="Dirección de entrega" value={f.address} onChange={set("address")} size="small" fullWidth />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField
              label="Precio por obra"
              value={f.price}
              onChange={set("price")}
              size="small"
              fullWidth
              error={tooHigh}
              helperText={tooHigh ? "No puede ser mayor al de la obra" : "Vacío = precio de cada obra"}
              inputProps={{ inputMode: "numeric" }}
            />
            <TextField select label="Medio de pago" value={f.method} onChange={set("method")} size="small" fullWidth>
              {CAJA_METHODS.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </TextField>
          </Stack>
          {discounted && (
            <TextField label="¿Quién autorizó el descuento?" value={f.note} onChange={set("note")} size="small" required />
          )}
          <TextField label="Enlace del comprobante (opcional)" value={f.receipt} onChange={set("receipt")} size="small" />
          <Typography variant="body2">
            Total: <b>{formatCOP(total)}</b>
            {discounted && ` · precio de lista ${formatCOP(artworks.reduce((s, a) => s + Number(a.price || 0), 0))}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Queda como una sola venta pagada: las obras salen vendidas en el QR, suma en reportes y la artista la ve en su panel.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy} color="inherit">Cancelar</Button>
        <Button onClick={submit} disabled={busy || invalid} variant="contained">
          {busy ? "Registrando…" : `Cobrar ${formatCOP(total)}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
