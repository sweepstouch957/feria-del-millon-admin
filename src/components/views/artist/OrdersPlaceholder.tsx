"use client";

import { useState } from "react";
import { Box, Button, Card, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import {
  CLAIM_METHOD_LABEL, decideArtistClaim, listMyArtistClaims, listMyClaimArtworks, reportArtistSale,
  type ArtistClaim, type ClaimMethod,
} from "@services/orders.service";
import { formatCOP } from "@/utils/money";

/* Ventas de las obras del artista que necesitan su respuesta:
   - compradores que dicen haber comprado una obra suya sin confirmación
     (/reclamo en la tienda): confirma o niega, y puede dejar la dirección;
   - ventas que el artista reporta aquí mismo porque le mostraron el
     comprobante del banco. La feria las registra y le llega el correo. */

const todayBogota = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

export default function OrdersPlaceholder() {
  const q = useQuery({ queryKey: ["myArtistClaims"], queryFn: listMyArtistClaims });
  const rows = q.data ?? [];
  const waiting = rows.filter((c) => c.status === "pending" && !c.decision);
  const [reporting, setReporting] = useState(false);

  return (
    <Box>
      <PageHeader
        crumb="Artista"
        title="Mis pedidos"
        description="Las ventas de tus obras en la feria. La feria te informa cada venta por correo."
        actions={[{ label: "Reportar una venta", onClick: () => setReporting(true) }]}
      />
      <Typography variant="h6" sx={{ mb: 1 }}>
        Ventas por confirmar {waiting.length > 0 && `(${waiting.length})`}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 680 }}>
        ¿Un comprador te mostró el comprobante de pago y no te llegó el correo de la venta? Usa “Reportar una venta”.
        Abajo también salen personas que dicen haber comprado una obra tuya: dinos si recuerdas esa venta.
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
      {reporting && <ReportSaleDialog onClose={() => setReporting(false)} />}
    </Box>
  );
}

function ClaimRow({ c }: { c: ArtistClaim }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(c.decisionNote);
  const [address, setAddress] = useState(c.address);
  const [busy, setBusy] = useState(false);
  const decide = async (decision: "confirmed" | "denied") => {
    setBusy(true);
    try {
      await decideArtistClaim(c.id, decision, note.trim() || undefined, address.trim() || undefined);
      toast.success(decision === "confirmed" ? "Gracias: la feria registrará la venta." : "Gracias: la feria lo revisará.");
      qc.invalidateQueries({ queryKey: ["myArtistClaims"] });
    } catch {
      toast.error("No se pudo guardar tu respuesta.");
    } finally {
      setBusy(false);
    }
  };
  const open = c.status === "pending" && c.source !== "artist";
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
          {(c.voucher || c.bank) && (
            <Typography variant="body2" color="text.secondary">
              Comprobante {[c.bank, c.voucher].filter(Boolean).join(" · ")}
            </Typography>
          )}
          {c.address && <Typography variant="body2" color="text.secondary">Entrega: {c.address}</Typography>}
          {c.note && <Typography variant="body2" sx={{ mt: 0.5, fontStyle: "italic" }}>“{c.note}”</Typography>}
        </Box>
        <StatusPill
          label={
            c.status === "resolved" ? "Registrada" : c.status === "rejected" ? "Descartada"
              : c.source === "artist" ? "Reportada por ti" : c.decision === "confirmed" ? "Confirmaste" : c.decision === "denied" ? "No la reconoces" : "Esperando tu respuesta"
          }
          tone={c.status === "resolved" || c.decision === "confirmed" ? "ok" : c.decision === "denied" || c.status === "rejected" ? "bad" : "warn"}
        />
      </Stack>
      {open && (
        <Stack spacing={1} sx={{ mt: 2 }}>
          <TextField size="small" label="Dirección de entrega (si la sabes)" value={address} onChange={(e) => setAddress(e.target.value)} fullWidth />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <TextField size="small" label="Comentario (opcional)" value={note} onChange={(e) => setNote(e.target.value)} fullWidth />
            <Button disabled={busy} variant="contained" onClick={() => decide("confirmed")} sx={{ whiteSpace: "nowrap" }}>Sí, la vendí</Button>
            <Button disabled={busy} color="error" variant="outlined" onClick={() => decide("denied")} sx={{ whiteSpace: "nowrap" }}>No la reconozco</Button>
          </Stack>
        </Stack>
      )}
    </Card>
  );
}

const EMPTY = {
  artwork: "", name: "", email: "", phone: "", document: "", address: "",
  purchasedOn: todayBogota(), method: "transferencia" as ClaimMethod, amount: "", voucher: "", bank: "", note: "",
};

const ERRORS: Record<string, string> = {
  artwork_invalid: "Elige la obra.",
  name_invalid: "Escribe el nombre del comprador.",
  email_invalid: "El correo no es válido.",
  date_invalid: "Revisa la fecha.",
  amount_invalid: "Escribe el valor pagado.",
  voucher_invalid: "Escribe el número del comprobante.",
  artwork_not_yours: "Esa obra no es tuya.",
};

/** El artista reporta una venta con lo que dice el comprobante del banco y los datos del comprador. */
function ReportSaleDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const arts = useQuery({ queryKey: ["myClaimArtworks"], queryFn: listMyClaimArtworks });
  const [f, setF] = useState(EMPTY);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setF((v) => ({ ...v, [k]: e.target.value }));
  const art = arts.data?.find((a) => a.id === f.artwork);

  const send = useMutation({
    mutationFn: () => reportArtistSale({ ...f, amount: Number(f.amount.replace(/\D/g, "")) }),
    onSuccess: (r) => {
      toast.success(r.alreadyRegistered ? "Esa venta ya estaba registrada a ese correo." : "Listo: la feria registrará la venta y te llegará el correo.");
      qc.invalidateQueries({ queryKey: ["myArtistClaims"] });
      onClose();
    },
    onError: (e: any) => toast.error(ERRORS[e?.response?.data?.error] ?? "No se pudo enviar."),
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reportar una venta</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Copia los datos del comprobante que te mostró el comprador. La feria verifica el pago y registra la venta.
        </Typography>
        <Stack spacing={1.5}>
          <TextField select label="Obra" value={f.artwork} onChange={set("artwork")} required disabled={arts.isLoading}>
            {(arts.data ?? []).map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.title} · {formatCOP(a.price)} · {a.stock > 0 ? `${a.stock} disponible(s)` : "sin stock"}
              </MenuItem>
            ))}
          </TextField>
          {art && art.stock <= 0 && (
            <Typography variant="body2" color="warning.main">Esa obra ya figura vendida: puede que esta venta ya esté registrada.</Typography>
          )}

          <Typography variant="subtitle2" sx={{ pt: 1 }}>Comprobante de pago</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField select label="Cómo pagó" value={f.method} onChange={set("method")} fullWidth>
              {(["transferencia", "datafono", "efectivo", "otro"] as ClaimMethod[]).map((m) => (
                <MenuItem key={m} value={m}>{CLAIM_METHOD_LABEL[m]}</MenuItem>
              ))}
            </TextField>
            <TextField label="Banco / entidad" placeholder="Bancolombia, Nequi…" value={f.bank} onChange={set("bank")} fullWidth />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField label="Valor pagado (COP)" value={f.amount} onChange={set("amount")} required fullWidth slotProps={{ htmlInput: { inputMode: "numeric" } }} />
            <TextField label="Número del comprobante" value={f.voucher} onChange={set("voucher")} required fullWidth />
            <TextField label="Fecha" type="date" value={f.purchasedOn} onChange={set("purchasedOn")} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>

          <Typography variant="subtitle2" sx={{ pt: 1 }}>Comprador</Typography>
          <TextField label="Nombre completo" value={f.name} onChange={set("name")} required />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField label="Correo" type="email" value={f.email} onChange={set("email")} fullWidth />
            <TextField label="Teléfono" value={f.phone} onChange={set("phone")} fullWidth />
            <TextField label="Cédula (opcional)" value={f.document} onChange={set("document")} fullWidth />
          </Stack>
          <TextField label="Dirección de entrega" placeholder="Dirección, ciudad" value={f.address} onChange={set("address")} />
          <TextField label="Nota (opcional)" value={f.note} onChange={set("note")} multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={send.isPending || !f.artwork || f.name.trim().length < 3 || !f.amount || f.voucher.trim().length < 3}
          onClick={() => send.mutate()}
        >
          {send.isPending ? "Enviando…" : "Enviar a la feria"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
