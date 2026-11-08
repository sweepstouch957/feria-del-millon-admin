"use client";

import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { markOrderPaid, type OrderDoc } from "@services/orders.service";
import { formatCOP } from "@/utils/money";

/** Etiqueta del método: el link de Bold viaja como credit_card + details.provider
 *  (el enum del back no tiene "bold" y cambiarlo obliga a reconstruir todos los servicios). */
export const BOLD_PROVIDER = "bold_link";
export const isBoldLink = (o?: Pick<OrderDoc, "payment"> | null) => o?.payment?.details?.provider === BOLD_PROVIDER;

/**
 * Mercado Pago rechazó la tarjeta pero el comprador pagó con un link de pago de
 * Bold. Usa POST /orders/:id/paid, que ya existe en el back: marca pagada,
 * descuenta el stock y envía el correo al comprador y al artista.
 */
export function MarkBoldPaidButton({ order, twinPaid }: { order: OrderDoc; twinPaid?: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState("");
  const pay = useMutation({
    mutationFn: () => {
      const reference = ref.trim() || `BOLD-LINK-${String(order.id).slice(-8).toUpperCase()}`;
      return markOrderPaid(order.id, {
        method: "credit_card",
        amount: order.total,
        reference,
        transactionId: reference,
        gateway: { provider: "bold" },
        details: { provider: BOLD_PROVIDER, label: "Link de pago Bold", boldReference: ref.trim() || undefined, markedAt: new Date().toISOString() } as any,
      });
    },
    onSuccess: (r) => {
      setOpen(false);
      if (r.already) toast.info("Esta orden ya estaba pagada.");
      else if (r.fulfillmentError) toast.warning(`Pagada, pero el stock no se descontó: ${r.fulfillmentError}`);
      else toast.success("Venta registrada con link Bold. Stock descontado y correos enviados.");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["artworks"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "No se pudo registrar el pago."),
  });

  if (!["failed", "payment_processing", "created"].includes(order.status)) return null;

  return (
    <>
      <Button size="small" color="success" onClick={() => setOpen(true)}>Pagó con link Bold</Button>
      <Dialog open={open} onClose={() => !pay.isPending && setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>¿Registrar pago con link Bold?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {order.buyer?.name || "Comprador"} · {(order.items || []).map((i) => i.title).filter(Boolean).join(", ")} ·{" "}
            <b>{formatCOP(order.total)}</b>. La orden queda pagada, se descuenta el stock y se envía el correo de
            confirmación al comprador y al artista. Verifica primero que el pago aparezca en Bold.
          </DialogContentText>
          {twinPaid && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Este comprador ya tiene otra orden pagada de esta misma obra. Revisa que no sea la misma compra antes de seguir.
            </Alert>
          )}
          <TextField
            label="Referencia del pago en Bold (opcional)"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            fullWidth
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={pay.isPending}>Cancelar</Button>
          <Button color="success" variant="contained" onClick={() => pay.mutate()} disabled={pay.isPending}>
            {pay.isPending ? "Registrando…" : "Sí, está pagado"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
