"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, Button, TextField, MenuItem, FormControlLabel, Checkbox, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, LinearProgress, IconButton, Tooltip,
} from "@mui/material";
import { Mail, Send, UserPlus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DEFAULT_EVENT_ID } from "@core/constants";
import { createInvitations, getTickets, getTicketDays, resendInvitation, type Ticket } from "@services/ticket.service";
import { listUsers } from "@services/user.service";
import { toCsv, downloadCsv, stamp } from "@/utils/csv";

const CATEGORIES = ["VIP", "Prensa", "Coleccionista", "Aliado", "Artista", "Mentor", "Curador"];

const STATUS: Record<string, { label: string; color: "default" | "success" | "info" | "warning" }> = {
  invited: { label: "Pendiente", color: "warning" },
  sold: { label: "Confirmada", color: "info" },
  checked_in: { label: "Asistió", color: "success" },
  canceled: { label: "Anulada", color: "default" },
};

/** "Nombre, correo" / "Nombre;correo" / "correo" por línea. */
function parseInvitees(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const email = l.match(/[^\s,;<>]+@[^\s,;<>]+\.[^\s,;<>]+/)?.[0] || "";
      const name = l.replace(email, "").replace(/[,;<>]/g, " ").trim() || email.split("@")[0];
      return { name, email };
    });
}

export default function InvitationsPage() {
  const eventId = DEFAULT_EVENT_ID;
  const qc = useQueryClient();
  const { data: daysRes } = useQuery({ queryKey: ["ticketDays", eventId], queryFn: () => getTicketDays(eventId) });
  const days = daysRes?.days || [];

  const [text, setText] = React.useState("");
  const [category, setCategory] = React.useState("VIP");
  const [date, setDate] = React.useState("");
  const [allDays, setAllDays] = React.useState(false);
  const [admits, setAdmits] = React.useState(2);
  const invitees = parseInvitees(text);

  // ponytail: primeras 200 invitaciones (tope del backend); paginar con nextCursor si pasan de eso.
  const { data: list = [], isFetching } = useQuery({
    queryKey: ["invitations", eventId],
    queryFn: async () => (await getTickets({ eventId, type: "invitacion", limit: 200 })).data as Ticket[],
  });

  const send = useMutation({
    mutationFn: () => createInvitations({ eventId, invitees, category, admits, allDays, date: allDays ? undefined : date || undefined }),
    onSuccess: (r) => {
      toast.success(`${r.created} invitaciones enviadas${r.skipped.length ? ` · ${r.skipped.length} omitidas (ya invitadas o inválidas)` : ""}`);
      setText("");
      qc.invalidateQueries({ queryKey: ["invitations", eventId] });
    },
    onError: () => toast.error("No se pudieron crear las invitaciones."),
  });

  const importRole = async (role: "vip" | "mentor" | "curador" | "asistente") => {
    const { users } = await listUsers({ roles: [role], limit: 200 });
    const lines = users.map((u: any) => `${[u.firstName, u.lastName].filter(Boolean).join(" ")}, ${u.email}`);
    setText((t) => [t.trim(), ...lines].filter(Boolean).join("\n"));
    toast.message(`${lines.length} contactos con rol ${role} agregados`);
  };

  const exportCsv = () =>
    downloadCsv(`invitaciones_${stamp()}.csv`, toCsv(list, [
      { header: "Nombre", value: (t) => t.buyer?.name },
      { header: "Email", value: (t) => t.buyer?.email },
      { header: "Teléfono", value: (t) => t.buyer?.phone, text: true },
      { header: "Acompañante", value: (t) => t.companionName },
      { header: "Categoría", value: (t) => t.inviteCategory },
      { header: "Personas", value: (t) => t.admits ?? 1 },
      { header: "Estado", value: (t) => STATUS[t.status]?.label || t.status },
    ]));

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: "auto" }}>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
        <Box sx={{ width: 40, height: 40, bgcolor: "rgba(63,164,110,0.14)", color: "#3FA46E", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Mail size={20} />
        </Box>
        <Box>
          <Typography fontWeight={500} fontSize={20}>Invitaciones</Typography>
          <Typography variant="caption" color="text.secondary">
            El invitado recibe un correo con botón de confirmación; al confirmar recibe su QR.
          </Typography>
        </Box>
      </Stack>

      <Card sx={{ borderRadius: 0, mb: 3 }}><CardContent>
        <Stack spacing={2}>
          <TextField
            multiline minRows={4} size="small" label="Invitados (uno por línea: Nombre, correo)"
            value={text} onChange={(e) => setText(e.target.value)}
            helperText={`${invitees.length} invitado(s) · ${invitees.filter((i) => !i.email).length} sin correo válido`}
          />
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {(["vip", "mentor", "curador", "asistente"] as const).map((r) => (
              <Button key={r} size="small" variant="text" startIcon={<UserPlus size={14} />} onClick={() => importRole(r)} sx={{ textTransform: "none" }}>
                Agregar usuarios {r}
              </Button>
            ))}
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <TextField select size="small" label="Categoría" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 160 }}>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Día" value={date} onChange={(e) => setDate(e.target.value)} disabled={allDays} sx={{ minWidth: 180 }}>
              <MenuItem value="">Inauguración (primer día)</MenuItem>
              {days.map((d) => <MenuItem key={d.date} value={d.date}>{d.display || d.date}</MenuItem>)}
            </TextField>
            <FormControlLabel control={<Checkbox checked={allDays} onChange={(e) => setAllDays(e.target.checked)} />} label="Todos los días" />
            <TextField size="small" type="number" label="Personas por QR" value={admits}
              onChange={(e) => setAdmits(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} sx={{ width: 150 }} />
            <Box flex={1} />
            <Button variant="contained" startIcon={<Send size={16} />} disabled={!invitees.some((i) => i.email) || send.isPending}
              onClick={() => send.mutate()} sx={{ textTransform: "none" }}>
              {send.isPending ? "Enviando…" : "Enviar invitaciones"}
            </Button>
          </Stack>
        </Stack>
      </CardContent></Card>

      <Card sx={{ borderRadius: 0 }}>
        {isFetching && <LinearProgress />}
        <CardContent>
          <Stack direction="row" alignItems="center" mb={1}>
            <Typography fontWeight={500} flex={1}>
              Enviadas: {list.length} · Confirmadas: {list.filter((t) => t.status !== "invited").length}
            </Typography>
            <Button size="small" variant="outlined" onClick={exportCsv} disabled={!list.length} sx={{ textTransform: "none" }}>Exportar Excel</Button>
          </Stack>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Invitado</TableCell><TableCell>Categoría</TableCell><TableCell>Acompañante</TableCell>
                <TableCell align="right">Personas</TableCell><TableCell>Estado</TableCell><TableCell />
              </TableRow></TableHead>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ color: "text.secondary", py: 3 }}>Aún no hay invitaciones.</TableCell></TableRow>
                ) : list.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell>
                      <Typography fontSize={13} fontWeight={500}>{t.buyer?.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.buyer?.email}</Typography>
                    </TableCell>
                    <TableCell>{t.inviteCategory || "—"}</TableCell>
                    <TableCell>{t.companionName || "—"}</TableCell>
                    <TableCell align="right">{t.admits ?? 1}</TableCell>
                    <TableCell><Chip size="small" label={STATUS[t.status]?.label || t.status} color={STATUS[t.status]?.color || "default"} /></TableCell>
                    <TableCell align="right">
                      {t.status === "invited" && (
                        <Tooltip title="Reenviar correo">
                          <IconButton size="small" onClick={() => resendInvitation(t.id).then(() => toast.success("Reenviada"), () => toast.error("No se pudo reenviar"))}>
                            <Send size={14} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
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
