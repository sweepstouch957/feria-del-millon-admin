"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, Button, TextField, Chip, Alert, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, LinearProgress,
} from "@mui/material";
import { Megaphone, Send, FileSpreadsheet, FlaskConical } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listSubscribers, previewCampaign, sendCampaign, listCampaigns,
} from "@services/siteConfig.service";
import { useAuth } from "@/provider/authProvider";
import { toCsv, downloadCsv, fmtDay, stamp } from "@/utils/csv";

// Mismas claves que ROLE_AUDIENCES/OTHER_AUDIENCES en event-svc.
const AUDIENCES: { key: string; label: string }[] = [
  { key: "suscriptores", label: "Boletín" },
  { key: "compradores", label: "Compradores" },
  { key: "vip", label: "VIP" },
  { key: "mentor", label: "Mentores" },
  { key: "asistente", label: "Asistentes" },
  { key: "curador", label: "Curadores" },
  { key: "artista", label: "Artistas" },
  { key: "staff", label: "Staff" },
];

const STATUS_LABEL: Record<string, string> = { sent: "Enviada", partial: "Parcial", failed: "Falló" };

export default function CommunicationsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [audiences, setAudiences] = React.useState<string[]>(["suscriptores"]);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [ctaLabel, setCtaLabel] = React.useState("");
  const [ctaUrl, setCtaUrl] = React.useState("");

  const toggle = (k: string) =>
    setAudiences((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]));

  const { data: preview, isFetching: counting } = useQuery({
    queryKey: ["campaign-preview", audiences],
    queryFn: () => previewCampaign(audiences),
    enabled: audiences.length > 0,
    staleTime: 60_000,
  });
  const { data: history = [] } = useQuery({ queryKey: ["campaigns"], queryFn: listCampaigns });

  const send = useMutation({
    mutationFn: (testEmail?: string) =>
      sendCampaign({ subject, body, ctaLabel, ctaUrl, audiences, testEmail }),
    onSuccess: (r, testEmail) => {
      if (testEmail) return toast.success(`Prueba enviada a ${testEmail}`);
      toast.success(`Enviada a ${r.sent} correos${r.failed ? ` · ${r.failed} fallaron` : ""}`);
      setSubject(""); setBody(""); setCtaLabel(""); setCtaUrl("");
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error === "no_recipients" ? "Esa selección no tiene correos." : "No se pudo enviar."),
  });

  const exportSubs = async () => {
    const rows = await listSubscribers(true);
    downloadCsv(`boletin_${stamp()}.csv`, toCsv(rows, [
      { header: "Email", value: (s) => s.email },
      { header: "Nombre", value: (s) => s.name },
      { header: "Origen", value: (s) => s.source },
      { header: "Alta", value: (s) => fmtDay(s.createdAt) },
      { header: "Baja", value: (s) => fmtDay(s.unsubscribedAt) },
    ]));
  };

  const ready = subject.trim().length > 2 && body.trim().length > 10;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: "auto" }}>
      <Stack direction="row" flexWrap="wrap" alignItems="center" spacing={1.5} mb={3} useFlexGap>
        <Box sx={{ width: 40, height: 40, bgcolor: "rgba(63,164,110,0.14)", color: "#3FA46E", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Megaphone size={20} />
        </Box>
        <Box flex={1}>
          <Typography fontWeight={500} fontSize={20}>Comunicaciones</Typography>
          <Typography variant="caption" color="text.secondary">
            Newsletter, catálogos y promociones a las bases. Cada correo lleva enlace para darse de baja.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<FileSpreadsheet size={16} />} onClick={exportSubs} sx={{ textTransform: "none" }}>
          Exportar boletín
        </Button>
      </Stack>

      <Card sx={{ borderRadius: 0, mb: 3 }}><CardContent>
        <Typography variant="caption" color="text.secondary">¿A quién?</Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} mt={1} mb={2}>
          {AUDIENCES.map((a) => (
            <Chip
              key={a.key}
              label={`${a.label}${preview?.byAudience?.[a.key] !== undefined ? ` (${preview.byAudience[a.key]})` : ""}`}
              color={audiences.includes(a.key) ? "primary" : "default"}
              variant={audiences.includes(a.key) ? "filled" : "outlined"}
              onClick={() => toggle(a.key)}
            />
          ))}
        </Stack>
        <Alert severity={preview?.total ? "info" : "warning"} sx={{ mb: 2 }}>
          {counting ? "Contando…" : `Llegaría a ${preview?.total ?? 0} correos únicos (sin repetir y sin quienes se dieron de baja).`}
        </Alert>

        <Stack spacing={2}>
          <TextField size="small" label="Asunto" value={subject} onChange={(e) => setSubject(e.target.value)} fullWidth />
          <TextField
            size="small" label="Mensaje" value={body} onChange={(e) => setBody(e.target.value)}
            multiline minRows={8} fullWidth
            helperText="Texto simple. Una línea en blanco separa párrafos."
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Texto del botón (opcional)" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} sx={{ flex: 1 }} />
            <TextField size="small" label="Enlace del botón" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} sx={{ flex: 2 }} placeholder="https://feriadelmillon.com/tickets" />
          </Stack>
          <Stack direction="row" spacing={2} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined" startIcon={<FlaskConical size={16} />} sx={{ textTransform: "none" }}
              disabled={!ready || send.isPending || !user?.email}
              onClick={() => send.mutate(user!.email)}
            >
              Enviarme una prueba
            </Button>
            <Button
              variant="contained" startIcon={<Send size={16} />} sx={{ textTransform: "none" }}
              disabled={!ready || send.isPending || !preview?.total}
              onClick={() => {
                if (confirm(`Se enviará a ${preview?.total} correos. ¿Confirmas?`)) send.mutate(undefined);
              }}
            >
              {send.isPending ? "Enviando…" : `Enviar a ${preview?.total ?? 0}`}
            </Button>
          </Stack>
        </Stack>
      </CardContent></Card>

      <Card sx={{ borderRadius: 0 }}>
        {send.isPending && <LinearProgress />}
        <CardContent>
          <Typography fontWeight={500} mb={1}>Envíos anteriores</Typography>
          <Divider sx={{ mb: 1 }} />
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Fecha</TableCell><TableCell>Asunto</TableCell><TableCell>Audiencias</TableCell>
                <TableCell align="right">Enviados</TableCell><TableCell align="right">Fallidos</TableCell><TableCell>Estado</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ color: "text.secondary", py: 3 }}>Aún no has enviado comunicaciones.</TableCell></TableRow>
                ) : history.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>{fmtDay(c.createdAt)}</TableCell>
                    <TableCell>{c.subject}</TableCell>
                    <TableCell><Typography variant="caption">{c.audiences.join(", ")}</Typography></TableCell>
                    <TableCell align="right">{c.sent}</TableCell>
                    <TableCell align="right">{c.failed}</TableCell>
                    <TableCell>{STATUS_LABEL[c.status] || c.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
