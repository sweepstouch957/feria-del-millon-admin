"use client";

import { useState } from "react";
import { Box, Button, Card, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import { CLAIM_METHOD_LABEL, decideArtistClaim, listMyArtistClaims, type ArtistClaim } from "@services/orders.service";
import { formatCOP } from "@/utils/money";

/* Ventas de las obras del artista. Por ahora solo lo que necesita su respuesta:
   compradores que dicen haber comprado una obra suya sin confirmación (/reclamo
   en la tienda). El artista confirma o niega; la feria registra la venta. */

export default function OrdersPlaceholder() {
  const q = useQuery({ queryKey: ["myArtistClaims"], queryFn: listMyArtistClaims });
  const rows = q.data ?? [];
  const waiting = rows.filter((c) => c.status === "pending" && !c.decision);

  return (
    <Box>
      <PageHeader
        crumb="Artista"
        title="Mis pedidos"
        description="Las ventas de tus obras en la feria. La feria te informa cada venta por correo."
      />
      <Typography variant="h6" sx={{ mb: 1 }}>
        Ventas por confirmar {waiting.length > 0 && `(${waiting.length})`}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 680 }}>
        Personas que dicen haber comprado una de tus obras y no tienen confirmación. Dinos si recuerdas esa venta:
        con tu respuesta la feria la registra y coordina la entrega.
      </Typography>
      {q.isLoading ? (
        <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Box>
      ) : !rows.length ? (
        <Card sx={{ p: 5, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">No hay ventas por confirmar.</Typography>
        </Card>
      ) : (
        <Stack spacing={1.5}>{rows.map((c) => <ClaimRow key={c.id} c={c} />)}</Stack>
      )}
    </Box>
  );
}

function ClaimRow({ c }: { c: ArtistClaim }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(c.decisionNote);
  const [busy, setBusy] = useState(false);
  const decide = async (decision: "confirmed" | "denied") => {
    setBusy(true);
    try {
      await decideArtistClaim(c.id, decision, note.trim() || undefined);
      toast.success(decision === "confirmed" ? "Gracias: la feria registrará la venta." : "Gracias: la feria lo revisará.");
      qc.invalidateQueries({ queryKey: ["myArtistClaims"] });
    } catch {
      toast.error("No se pudo guardar tu respuesta.");
    } finally {
      setBusy(false);
    }
  };
  const open = c.status === "pending";
  return (
    <Card sx={{ p: 2.5 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
        <Box>
          <Typography sx={{ fontWeight: 600 }}>{c.artworkTitle}</Typography>
          <Typography variant="body2" color="text.secondary">
            {c.buyerName} · {c.purchasedOn} · {CLAIM_METHOD_LABEL[c.method] || c.method}
            {c.amount ? ` · ${formatCOP(c.amount)}` : ""}
            {c.seller && ` · le vendió ${c.seller}`}
          </Typography>
          {c.note && <Typography variant="body2" sx={{ mt: 0.5, fontStyle: "italic" }}>“{c.note}”</Typography>}
        </Box>
        <StatusPill
          label={c.status === "resolved" ? "Registrada" : c.status === "rejected" ? "Descartada" : c.decision === "confirmed" ? "Confirmaste" : c.decision === "denied" ? "No la reconoces" : "Esperando tu respuesta"}
          tone={c.status === "resolved" || c.decision === "confirmed" ? "ok" : c.decision === "denied" || c.status === "rejected" ? "bad" : "warn"}
        />
      </Stack>
      {open && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }} alignItems={{ sm: "center" }}>
          <TextField size="small" label="Comentario (opcional)" value={note} onChange={(e) => setNote(e.target.value)} fullWidth />
          <Button disabled={busy} variant="contained" onClick={() => decide("confirmed")} sx={{ whiteSpace: "nowrap" }}>Sí, la vendí</Button>
          <Button disabled={busy} color="error" variant="outlined" onClick={() => decide("denied")} sx={{ whiteSpace: "nowrap" }}>No la reconozco</Button>
        </Stack>
      )}
    </Card>
  );
}
