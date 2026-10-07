"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, Button, TextField, MenuItem, FormControlLabel, Checkbox, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, LinearProgress, IconButton, Tooltip,
} from "@mui/material";
import { Send, UserPlus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import StatusPill, { type PillTone } from "@/components/ui/StatusPill";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { createInvitations, getTickets, getTicketDays, resendInvitation, type Ticket } from "@services/ticket.service";
import { listUsers } from "@services/user.service";
import { toCsv, downloadCsv, stamp } from "@/utils/csv";

const CATEGORIES = ["VIP", "Prensa", "Coleccionista", "Aliado", "Artista", "Mentor", "Curador"];

const STATUS: Record<string, { label: string; tone: PillTone }> = {
  invited: { label: "Pendiente", tone: "warn" },
  sold: { label: "Confirmada", tone: "mid" },
  checked_in: { label: "Asistió", tone: "ok" },
  canceled: { label: "Anulada", tone: "mid" },
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
  const { eventId, isLoading, isError, refetch } = useActiveEvent();
  if (!eventId) return <ActiveEventGate isLoading={isLoading} isError={isError} onRetry={refetch} />;
  return <Invitations eventId={eventId} />;
}

function Invitations({ eventId }: { eventId: string }) {
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
      // Datos de la inscripción: los llena el invitado al confirmar.
      { header: "Identificación", value: (t) => t.buyer?.documentNumber, text: true },
      { header: "Dirección", value: (t) => t.buyer?.address },
      { header: "Acompañante", value: (t) => t.companionName },
      { header: "Categoría", value: (t) => t.inviteCategory },
      { header: "Personas", value: (t) => t.admits ?? 1 },
      { header: "Estado", value: (t) => STATUS[t.status]?.label || t.status },
    ]));

  return (
    <Box>
      <PageHeader
        crumb="Boletos"
        title="Invitaciones"
        description="El invitado recibe un correo con botón de confirmación; al confirmar recibe su QR."
        actions={[
          {
            label: "Exportar Excel",
            kind: "sec",
            disabled: !list.length,
            onClick: exportCsv,
          },
        ]}
      />

      <KpiStrip
        items={[
          { label: "Enviadas", value: list.length },
          { label: "Confirmadas", value: list.filter((t) => t.status !== "invited").length },
          { label: "Asistieron", value: list.filter((t) => t.status === "checked_in").length, accent: true },
          { label: "En este envío", value: invitees.length },
        ]}
      />

      <Card sx={{ mb: 3 }}><CardContent>
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

      <Card>
        {isFetching && <LinearProgress />}
        <CardContent>
          <Typography sx={{ fontSize: 17, letterSpacing: "0.01em", pb: 1.5, mb: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
            Invitaciones enviadas
          </Typography>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Invitado</TableCell><TableCell>Categoría</TableCell>
                <TableCell>Inscripción</TableCell><TableCell>Acompañante</TableCell>
                <TableCell align="right">Personas</TableCell><TableCell>Estado</TableCell><TableCell />
              </TableRow></TableHead>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ color: "text.secondary", py: 3 }}>Aún no hay invitaciones.</TableCell></TableRow>
                ) : list.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell>
                      <Typography fontSize={13} fontWeight={500}>{t.buyer?.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.buyer?.email}</Typography>
                    </TableCell>
                    <TableCell>{t.inviteCategory || "—"}</TableCell>
                    {/* Lo que llenó al confirmar: sin eso, todavía no se inscribió. */}
                    <TableCell>
                      {t.buyer?.documentNumber || t.buyer?.address ? (
                        <>
                          <Typography fontSize={13}>{t.buyer?.documentNumber || "—"}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ maxWidth: 220 }}>
                            {t.buyer?.phone ? `${t.buyer.phone} · ` : ""}{t.buyer?.address || ""}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="caption" color="text.secondary">Sin inscribir</Typography>
                      )}
                    </TableCell>
                    <TableCell>{t.companionName || "—"}</TableCell>
                    <TableCell align="right">{t.admits ?? 1}</TableCell>
                    <TableCell><StatusPill label={STATUS[t.status]?.label || t.status} tone={STATUS[t.status]?.tone || "mid"} /></TableCell>
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
