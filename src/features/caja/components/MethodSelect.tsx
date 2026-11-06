"use client";

import { MenuItem, TextField } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { changeOrderPaymentMethod } from "@services/orders.service";
import { CAJA_METHODS, METHOD_LABEL } from "../model/sale";

/** Corrige el método de una venta de caja (dijeron efectivo y pagaron con tarjeta, etc.). */
export function MethodSelect({ orderId, method }: { orderId: string; method: string }) {
  const qc = useQueryClient();
  const change = useMutation({
    mutationFn: (m: string) => changeOrderPaymentMethod(orderId, m),
    onSuccess: (r) => {
      toast.success(`Método cambiado a ${METHOD_LABEL[r.method] ?? r.method}.`);
      qc.invalidateQueries({ queryKey: ["caja", "my-sales"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "No se pudo cambiar el método."),
  });

  // Pagos en línea (Mercado Pago, PSE): no se corrigen desde la caja.
  if (!(method in METHOD_LABEL)) return null;

  return (
    <TextField
      select
      size="small"
      value={method}
      disabled={change.isPending}
      onChange={(e) => e.target.value !== method && change.mutate(e.target.value)}
      sx={{ minWidth: 140 }}
      slotProps={{ htmlInput: { "aria-label": "Método de pago" } }}
    >
      {CAJA_METHODS.map((m) => (
        <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
      ))}
    </TextField>
  );
}
