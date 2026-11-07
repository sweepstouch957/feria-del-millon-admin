"use client";

import { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { eyebrow } from "@/app/theme";
import { formatCOP } from "@/utils/money";
import { correctSale, type CorrectionKind, type PayPart } from "@services/corrections.service";

// Obras guardan la transferencia como "whatsapp"; las entradas como "transfer".
const METHODS: Record<CorrectionKind, { value: string; label: string }[]> = {
  order: [
    { value: "cash", label: "Efectivo" },
    { value: "card_offline", label: "Datáfono" },
    { value: "whatsapp", label: "Transferencia" },
  ],
  ticket: [
    { value: "cash", label: "Efectivo" },
    { value: "card_offline", label: "Datáfono" },
    { value: "transfer", label: "Transferencia" },
  ],
};

export interface CorrectionTarget {
  kind: CorrectionKind;
  id: string;
  title: string;
  /** Cómo está pagada hoy (un método o varios). */
  split: PayPart[];
  email: string;
  /** Obra: total de la venta. Entradas: precio por entrada. */
  price: number;
}

/**
 * La cajera corrige su venta. Cuánto entró por cada método se guarda de una vez;
 * precio y correo van a aprobación de administración.
 */
export function CorrectionDialog({ target, onClose }: { target: CorrectionTarget | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!target) return;
    setAmounts(Object.fromEntries(target.split.map((p) => [p.method, String(p.amount)])));
    setEmail(target.email);
    setPrice(String(target.price || ""));
    setNote("");
  }, [target]);

  const total = target?.split.reduce((s, p) => s + p.amount, 0) ?? 0;
  const sum = Object.values(amounts).reduce((s, v) => s + (Number(v) || 0), 0);
  const asks = !!target && (email.trim() !== target.email || Number(price) !== target.price);

  const send = useMutation({
    mutationFn: () =>
      correctSale({
        kind: target!.kind,
        id: target!.id,
        split: Object.fromEntries(Object.entries(amounts).map(([m, v]) => [m, Number(v) || 0])),
        email: email.trim() !== target!.email ? email.trim() : undefined,
        price: Number(price) !== target!.price ? Number(price) : undefined,
        note,
      }),
    onSuccess: (r) => {
      toast.success(
        [r.applied && "Método de pago corregido.", r.pending && "Precio/correo enviado a aprobación."].filter(Boolean).join(" ") || "Listo."
      );
      qc.invalidateQueries({ queryKey: ["caja", "my-sales"] });
      qc.invalidateQueries({ queryKey: ["ticketSales"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "No se pudo corregir la venta."),
  });

  if (!target) return null;
  const off = sum - total;
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Corregir venta</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{target.title}</Typography>

        <Typography sx={{ ...eyebrow, fontSize: 10, color: "text.secondary", mb: 1 }}>Método de pago · se guarda de una vez</Typography>
        <Stack spacing={1.5}>
          {METHODS[target.kind].map((m) => (
            <TextField
              key={m.value}
              size="small"
              label={m.label}
              type="number"
              value={amounts[m.value] ?? ""}
              onChange={(e) => setAmounts((a) => ({ ...a, [m.value]: e.target.value }))}
              slotProps={{ htmlInput: { min: 0, inputMode: "numeric" } }}
            />
          ))}
          <Typography variant="body2" color={off ? "error" : "text.secondary"}>
            {off ? `${off > 0 ? "Sobran" : "Faltan"} ${formatCOP(Math.abs(off))} para el total de ${formatCOP(total)}` : `Cuadra con el total de ${formatCOP(total)}.`}
          </Typography>
        </Stack>

        <Box sx={{ mt: 3 }}>
          <Typography sx={{ ...eyebrow, fontSize: 10, color: "text.secondary", mb: 1 }}>Precio y correo · los aprueba administración</Typography>
          <Stack spacing={1.5}>
            <TextField
              size="small"
              label={target.kind === "ticket" ? "Precio por entrada (COP)" : "Total de la venta (COP)"}
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <TextField size="small" label="Correo del comprador" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {asks && (
              <TextField
                size="small"
                label="Motivo"
                placeholder="Ej.: el artista dio descuento…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                multiline
                minRows={2}
                required
              />
            )}
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={send.isPending || off !== 0 || (asks && note.trim().length < 3)} onClick={() => send.mutate()}>
          {send.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
