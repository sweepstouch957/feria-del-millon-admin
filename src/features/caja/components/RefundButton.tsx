"use client";

import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { refundOrder, type OrderDoc } from "@services/orders.service";
import { formatCOP } from "@/utils/money";

/** Reembolsar una venta pagada: la obra vuelve al inventario. Pide confirmación. */
export function RefundButton({ order }: { order: OrderDoc }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const refund = useMutation({
    mutationFn: () => refundOrder(order.id),
    onSuccess: (r) => {
      setOpen(false);
      if (r.restoreError) toast.warning(`Reembolsado, pero la obra no volvió al inventario: ${r.restoreError}`);
      else toast.success("Venta reembolsada. La obra vuelve a estar disponible.");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["artworks"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "No se pudo reembolsar."),
  });

  if (order.status !== "paid") return null;

  return (
    <>
      <Button size="small" color="error" onClick={() => setOpen(true)}>Reembolsar</Button>
      <Dialog open={open} onClose={() => !refund.isPending && setOpen(false)}>
        <DialogTitle>¿Reembolsar esta venta?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {order.buyer?.name || "Comprador"} · {formatCOP(order.total)}. La obra vuelve al inventario y se puede
            vender de nuevo. Devuelve el dinero por el mismo medio con el que pagó; esto no lo hace el sistema.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={refund.isPending}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => refund.mutate()} disabled={refund.isPending}>
            {refund.isPending ? "Reembolsando…" : "Sí, reembolsar"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
