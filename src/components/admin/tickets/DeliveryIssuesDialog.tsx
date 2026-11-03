"use client";

import * as React from "react";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { Check, Pencil, RefreshCw, Send, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fixInvitationEmail, resendFailedDeliveries, type DeliveryIssue } from "@services/ticket.service";

/* Correos de invitación o pase que Mailchimp no pudo entregar.
   - Reenviables (rebote temporal, buzón lleno, spam): un botón para todos.
   - "El correo no existe" / ya había rebotado: hay que corregir la dirección
     (se llama o se le escribe por WhatsApp) y al guardarla se le reenvía. */

export const deliveryKey = (eventId: string) => ["invitation-delivery", eventId] as const;

function EmailFix({ row, onDone }: { row: DeliveryIssue; onDone: () => void }) {
  const [editing, setEditing] = React.useState(false);
  const [email, setEmail] = React.useState(row.email);
  const fix = useMutation({
    mutationFn: () => fixInvitationEmail(row.id, email.trim()),
    onSuccess: (r) => {
      if (r.sent.length) toast.success(`Corregido y reenviado a ${r.sent.map((s) => s.email).join(", ")}`);
      else toast.error(`Se guardó el correo pero no salió: ${r.failed[0]?.error || "error"}`);
      setEditing(false);
      onDone();
    },
    onError: () => toast.error("No se pudo corregir el correo"),
  });
  if (!editing)
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography fontSize={13} sx={{ wordBreak: "break-all" }}>{row.email}</Typography>
        <Tooltip title="Corregir correo y reenviar">
          <IconButton size="small" onClick={() => setEditing(true)} aria-label={`Corregir correo de ${row.name}`}><Pencil size={13} /></IconButton>
        </Tooltip>
      </Box>
    );
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <TextField size="small" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus sx={{ minWidth: 220 }}
        inputProps={{ "aria-label": "Correo corregido" }} onKeyDown={(e) => e.key === "Enter" && fix.mutate()} />
      <IconButton size="small" color="primary" disabled={fix.isPending || !email.includes("@")} onClick={() => fix.mutate()} aria-label="Guardar y reenviar"><Check size={15} /></IconButton>
      <IconButton size="small" onClick={() => { setEditing(false); setEmail(row.email); }} aria-label="Cancelar"><X size={15} /></IconButton>
    </Box>
  );
}

export default function DeliveryIssuesDialog({
  open, onClose, eventId, rows, loading, partial, checkedAt, onRefresh,
}: {
  open: boolean; onClose: () => void; eventId: string; rows: DeliveryIssue[]; loading: boolean;
  partial?: boolean; checkedAt?: string; onRefresh: () => void;
}) {
  const qc = useQueryClient();
  const retryable = rows.filter((r) => r.retry);
  const resend = useMutation({
    mutationFn: () => resendFailedDeliveries(eventId),
    onSuccess: (r) => {
      if (r.sent.length) toast.success(`Reenviado a ${r.sent.length} ${r.sent.length === 1 ? "persona" : "personas"}`);
      if (r.failed.length) toast.error(`No salió para ${r.failed.map((f) => f.email).join(", ")}`, { duration: 8000 });
      qc.invalidateQueries({ queryKey: deliveryKey(eventId) });
    },
    onError: () => toast.error("No se pudo reenviar"),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Correos que no llegaron
        <Typography variant="body2" color="text.secondary">
          Invitaciones y pases que el servidor de correo del invitado rechazó.
          {checkedAt ? ` Revisado ${new Date(checkedAt).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}.` : ""}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {partial && <Alert severity="warning" sx={{ mb: 2 }}>Mailchimp no dejó revisar todo (límite de consultas). Vuelve a revisar en unos minutos.</Alert>}
        <Alert severity="info" sx={{ mb: 2 }}>
          <b>Reenviar a todos</b> manda otra vez la invitación o el pase a quienes tuvieron un rebote temporal, buzón lleno o lo marcaron como spam.
          A quienes dice <b>“El correo no existe”</b> hay que pedirles el correo bien escrito (llamar o WhatsApp) y corregirlo con el lápiz: al guardar se le reenvía.
        </Alert>
        {!loading && rows.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>Ningún correo con error. 🎉</Typography>
        ) : (
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>Persona</TableCell><TableCell>Correo</TableCell><TableCell>Qué pasó</TableCell><TableCell>Estado</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Typography fontSize={13} fontWeight={500}>{r.name || "—"}</Typography>
                    {r.hostName && <Typography variant="caption" color="text.secondary">Acompañante de {r.hostName}</Typography>}
                    {r.phone && <Typography variant="caption" color="text.secondary" display="block">{r.phone}</Typography>}
                  </TableCell>
                  <TableCell><EmailFix row={r} onDone={() => qc.invalidateQueries({ queryKey: deliveryKey(eventId) })} /></TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" color={r.retry ? "warning" : "error"} label={r.reason} />
                    <Typography variant="caption" color="text.secondary" display="block">
                      {new Date(r.at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                    </Typography>
                  </TableCell>
                  <TableCell>{r.status === "invited" ? "Sin confirmar" : r.status === "declined" ? "Declinó" : "Confirmado"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: "wrap" }}>
        <Button onClick={onClose} color="inherit">Cerrar</Button>
        <Button startIcon={<RefreshCw size={14} />} onClick={onRefresh} disabled={loading}>Revisar de nuevo</Button>
        <Button variant="contained" startIcon={<Send size={14} />} disabled={!retryable.length || resend.isPending} onClick={() => resend.mutate()}>
          {resend.isPending ? "Reenviando…" : `Reenviar a todos (${retryable.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
