"use client";

import { useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/provider/authProvider";
import { formatCOP } from "@/utils/money";
import { methodLabel } from "@features/ingresos/model/income";
import { decideCorrection, listCorrections, type PayPart, type SaleCorrection } from "@services/corrections.service";

export const when = (d?: string) =>
  d ? new Date(d).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" }) : "";

const splitText = (s?: PayPart[]) => (s ?? []).map((p) => `${methodLabel(p.method)} ${formatCOP(p.amount)}`).join(" + ") || "—";

/** Antes → después de cada campo que cambia. */
export function Diff({ c }: { c: SaleCorrection }) {
  const rows: [string, string, string][] = [];
  if (c.changes.split) rows.push(["Método de pago", splitText(c.before.split), splitText(c.changes.split)]);
  if (c.changes.email) rows.push(["Correo", c.before.email || "—", c.changes.email]);
  if (c.changes.price) {
    rows.push([c.kind === "ticket" ? "Precio por entrada" : "Total", formatCOP(c.before.price), formatCOP(c.changes.price)]);
  }
  return (
    <Stack spacing={1} sx={{ my: 2 }}>
      {rows.map(([k, a, b]) => (
        <Box key={k}>
          <Typography variant="caption" color="text.secondary">{k}</Typography>
          <Typography>
            <Box component="span" sx={{ textDecoration: "line-through", color: "text.secondary" }}>{a}</Box>
            {"  →  "}
            <b>{b}</b>
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

/**
 * Pop-up de administración: cada cambio de precio o correo que pide una cajera
 * aparece aquí y no se aplica hasta que alguien lo aprueba. Revisa cada 30 s.
 * (El método de pago la cajera lo corrige sola.)
 */
export function CorrectionsPopup() {
  const roles = (useAuth().user?.roles || {}) as Record<string, boolean | undefined>;
  const admin = !!(roles.superuser || roles.staff || roles.curador);
  const qc = useQueryClient();
  // "Después": se oculta en esta sesión hasta recargar.
  const [later, setLater] = useState<string[]>([]);
  const { data = [] } = useQuery({
    queryKey: ["corrections", "pending"],
    queryFn: () => listCorrections("pending"),
    enabled: admin,
    refetchInterval: 30_000,
  });
  const decide = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => decideCorrection(id, approve),
    onSuccess: (r) => {
      toast.success(r.status === "approved" ? "Corrección aplicada." : "Corrección rechazada.");
      qc.invalidateQueries({ queryKey: ["corrections"] });
      qc.invalidateQueries({ queryKey: ["caja", "my-sales"] });
      qc.invalidateQueries({ queryKey: ["ticketSales"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "No se pudo guardar la decisión."),
  });

  const queue = data.filter((c) => !later.includes(c.id));
  const c = queue[0];
  if (!admin || !c) return null;

  return (
    <Dialog open fullWidth maxWidth="xs">
      <DialogTitle>
        Corrección de venta {queue.length > 1 ? `(1 de ${queue.length})` : ""}
      </DialogTitle>
      <DialogContent>
        <Typography>
          <b>{c.requestedByName || "Una cajera"}</b> pide corregir{" "}
          {c.kind === "ticket" ? "entradas" : "la venta de"} <b>{c.label}</b>
          {c.buyerName ? ` a ${c.buyerName}` : ""}
          {c.saleAt ? ` (${when(c.saleAt)})` : ""}.
        </Typography>
        <Diff c={c} />
        <Typography variant="body2" color="text.secondary">Motivo: {c.note}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setLater((l) => [...l, c.id])} disabled={decide.isPending}>Después</Button>
        <Button color="error" onClick={() => decide.mutate({ id: c.id, approve: false })} disabled={decide.isPending}>
          Rechazar
        </Button>
        <Button variant="contained" onClick={() => decide.mutate({ id: c.id, approve: true })} disabled={decide.isPending}>
          Aprobar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
