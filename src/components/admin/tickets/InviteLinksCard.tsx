"use client";

import * as React from "react";
import {
  Box, Button, Card, CardContent, Chip, IconButton, MenuItem, Stack, Switch, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { Copy, Download, Link2, Mail } from "lucide-react";
import InviteLinkEmailDialog from "./InviteLinkEmailDialog";
import QRCode from "qrcode";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SHOP_URL } from "@core/constants";
import { createInviteLink, listInviteLinks, updateInviteLink, type InviteLink } from "@services/ticket.service";

/* Enlaces públicos de registro: para invitados que no están en la base con
   correo. Se imprime el enlace corto (o su QR) en una pieza y la persona se
   inscribe sola; recibe su pase con QR al instante. Cada enlace tiene cupo y
   se puede apagar. */

const base = SHOP_URL.replace(/\/+$/, "");
const shortUrl = (code: string) => `${base}/i/${code}`;
const prettyUrl = (code: string) => shortUrl(code).replace(/^https?:\/\//, "");

export default function InviteLinksCard({ eventId, defaultMessage = "" }: { eventId: string; defaultMessage?: string }) {
  const [emailFor, setEmailFor] = React.useState<InviteLink | null>(null);
  const qc = useQueryClient();
  const { data: links = [], isLoading } = useQuery({
    queryKey: ["invite-links", eventId],
    queryFn: () => listInviteLinks(eventId),
  });

  const [code, setCode] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [admits, setAdmits] = React.useState(1);
  const [maxUses, setMaxUses] = React.useState(100);
  const codeBad = !!code && !/^[a-z0-9-]{3,24}$/.test(code);

  const create = useMutation({
    mutationFn: () => createInviteLink({ eventId, code: code || undefined, label, admits, maxUses, anyDay: true, category: "VIP" }),
    onSuccess: (l) => {
      qc.invalidateQueries({ queryKey: ["invite-links", eventId] });
      setCode("");
      setLabel("");
      toast.success(`Enlace listo: ${prettyUrl(l.code)}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "No se pudo crear el enlace"),
  });
  const update = useMutation({
    mutationFn: ({ id, ...b }: { id: string; active?: boolean; maxUses?: number }) => updateInviteLink(id, b),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invite-links", eventId] }),
    onError: () => toast.error("No se pudo actualizar el enlace"),
  });

  const copy = async (c: string) => {
    try {
      await navigator.clipboard.writeText(shortUrl(c));
      toast.success("Enlace copiado");
    } catch {
      toast.message(shortUrl(c));
    }
  };
  const downloadQr = async (c: string) => {
    const url = await QRCode.toDataURL(shortUrl(c), { width: 1200, margin: 2, errorCorrectionLevel: "M" });
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-registro-${c}.png`;
    a.click();
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
          <Link2 size={18} />
          <Typography fontWeight={600}>Enlaces de registro</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={2} maxWidth={760}>
          Para invitados que no tienen correo en la base. Pon el enlace corto (o su QR) en una pieza; la persona deja sus datos y
          recibe su pase con QR al instante. Un registro por correo; cuando se llena el cupo o lo apagas, deja de recibir.
        </Typography>

        <Stack direction={{ xs: "column", md: "row" }} gap={1.5} alignItems={{ md: "flex-start" }} mb={2.5}>
          <TextField
            size="small" label="Código (lo que va en el enlace)" value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
            placeholder="artistas" error={codeBad}
            helperText={codeBad ? "3 a 24 letras minúsculas, números o guiones" : code ? prettyUrl(code) : "Vacío = uno al azar"}
            sx={{ minWidth: 230 }}
          />
          <TextField size="small" label="Para quién (solo lo ves tú)" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Artistas Salón Colombia" sx={{ flex: 1, minWidth: 200 }} helperText=" " />
          <TextField select size="small" label="Pase" value={admits} onChange={(e) => setAdmits(Number(e.target.value))} sx={{ minWidth: 150 }} helperText="1 día a elección">
            <MenuItem value={1}>1 persona</MenuItem>
            <MenuItem value={2}>2 personas (2 QR)</MenuItem>
          </TextField>
          <TextField size="small" type="number" label="Cupo" value={maxUses} onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value) || 1))} sx={{ width: 110 }} helperText="registros" />
          <Button variant="contained" onClick={() => create.mutate()} disabled={create.isPending || codeBad} sx={{ mt: { md: 0.25 } }}>
            {create.isPending ? "Creando…" : "Crear enlace"}
          </Button>
        </Stack>

        {isLoading ? (
          <Typography variant="body2" color="text.secondary">Cargando enlaces…</Typography>
        ) : links.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Todavía no hay enlaces.</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Enlace</TableCell>
                  <TableCell>Para quién</TableCell>
                  <TableCell align="center">Registros</TableCell>
                  <TableCell align="center">Activo</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {links.map((l: InviteLink) => (
                  <TableRow key={l.id} hover>
                    <TableCell>
                      <Typography fontWeight={600} fontSize={14}>{prettyUrl(l.code)}</Typography>
                      <Typography variant="caption" color="text.secondary">{l.admits > 1 ? `${l.admits} personas por pase` : "1 persona"} · 1 día a elección</Typography>
                    </TableCell>
                    <TableCell>{l.label || "—"}</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        color={l.uses >= l.maxUses ? "warning" : "default"}
                        label={`${l.uses} / ${l.maxUses}`}
                        onClick={() => {
                          const v = window.prompt(`Nuevo cupo para ${l.code} (hoy ${l.maxUses}):`, String(l.maxUses + 50));
                          const n = Number(v);
                          if (v !== null && n >= 1) update.mutate({ id: l.id, maxUses: n });
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Switch size="small" checked={l.active} onChange={(e) => update.mutate({ id: l.id, active: e.target.checked })} />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" startIcon={<Mail size={14} />} onClick={() => setEmailFor(l)} sx={{ mr: 1, textTransform: "none" }}>
                        Correo{l.emailsSent ? ` (${l.emailsSent})` : ""}
                      </Button>
                      <Tooltip title="Copiar enlace"><IconButton size="small" onClick={() => copy(l.code)}><Copy size={16} /></IconButton></Tooltip>
                      <Tooltip title="Descargar QR para la pieza"><IconButton size="small" onClick={() => downloadQr(l.code)}><Download size={16} /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Box mt={1}>
          <Typography variant="caption" color="text.secondary">
            Quienes se registran por un enlace aparecen en la lista de invitaciones de abajo, ya confirmados. Toca el cupo para ampliarlo.
          </Typography>
        </Box>
      </CardContent>
      <InviteLinkEmailDialog
        link={emailFor ? links.find((x: InviteLink) => x.id === emailFor.id) || emailFor : null}
        open={!!emailFor}
        onClose={() => setEmailFor(null)}
        defaultMessage={defaultMessage}
        shortUrl={emailFor ? shortUrl(emailFor.code) : ""}
      />
    </Card>
  );
}
