"use client";

import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useActiveEvent } from "@hooks/events/useActiveEvent";
import { getDeliveryConfirmSummary, sendDeliveryConfirm } from "@services/orders.service";

/** Correo a cada comprador: confirmación de compra + botón para confirmar la dirección de entrega. */
export function DeliveryConfirmDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { eventId } = useActiveEvent();
  const summary = useQuery({
    queryKey: ["orders", "delivery-confirm", eventId],
    queryFn: () => getDeliveryConfirmSummary(eventId!),
    enabled: open && !!eventId,
  });
  const send = useMutation({
    mutationFn: ({ mode, kind }: { mode: "test" | "pending"; kind: "paid" | "layaway" }) => sendDeliveryConfirm(eventId!, mode, kind),
    onSuccess: (r, { mode }) => {
      if (mode === "test") toast.success(`Prueba enviada a ${r.to} (con la compra de ${r.sample}).`);
      else {
        toast.success(`Enviando ${r.queued} correo(s). Tarda unos minutos.`);
        onClose();
      }
      qc.invalidateQueries({ queryKey: ["orders", "delivery-confirm"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "No se pudo enviar."),
  });
  const s = summary.data;

  return (
    <Dialog open={open} onClose={() => !send.isPending && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Correo de confirmación y dirección de entrega</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Le llega a cada comprador (uno por correo, con todas sus obras pagadas). Sirve de confirmación de compra y trae un botón
          para confirmar o corregir la dirección y el celular de entrega. Sale desde el remitente de Ventas.
        </DialogContentText>
        <Stack direction="row" spacing={4} sx={{ mt: 2 }}>
          {[
            ["Compradores", s?.buyers],
            ["Sin enviar", s?.pending],
            ["Ya confirmaron", s?.confirmed],
          ].map(([label, n]) => (
            <div key={label as string}>
              <Typography variant="h5">{summary.isLoading ? "…" : (n ?? 0)}</Typography>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
            </div>
          ))}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No incluye ventas sin correo real (caja genérica o pases en lote). Si alguien compra después, vuelve a quedar “sin enviar”.
        </Typography>

        <Typography variant="subtitle1" sx={{ mt: 3, fontWeight: 600 }}>Apartados (abono / fiado)</Typography>
        <Typography variant="body2" color="text.secondary">
          Confirmación de apartado: las obras, lo abonado y el saldo pendiente. No pide dirección.
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
          <Typography variant="body2">
            <b>{summary.isLoading ? "…" : (s?.layaway?.buyers ?? 0)}</b> con apartado · <b>{s?.layaway?.pending ?? 0}</b> sin enviar
          </Typography>
          <Button size="small" onClick={() => send.mutate({ mode: "test", kind: "layaway" })} disabled={send.isPending || !s?.layaway?.buyers}>
            Enviarme una prueba
          </Button>
          <Button size="small" variant="outlined" onClick={() => send.mutate({ mode: "pending", kind: "layaway" })} disabled={send.isPending || !s?.layaway?.pending}>
            Enviar a {s?.layaway?.pending ?? 0} con apartado
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={send.isPending}>Cerrar</Button>
        <Button onClick={() => send.mutate({ mode: "test", kind: "paid" })} disabled={send.isPending || !s?.buyers}>Enviarme una prueba</Button>
        <Button variant="contained" onClick={() => send.mutate({ mode: "pending", kind: "paid" })} disabled={send.isPending || !s?.pending}>
          {send.isPending ? "Enviando…" : `Enviar a ${s?.pending ?? 0} comprador(es)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
