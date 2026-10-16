"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, Button, TextField, MenuItem, FormControlLabel, Checkbox, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, LinearProgress, IconButton, Tooltip,
} from "@mui/material";
import { ImagePlus, Send, UserPlus, X } from "lucide-react";
import { uploadCampaignImage } from "@services/upload.service";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import StatusPill, { type PillTone } from "@/components/ui/StatusPill";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { createInvitations, getTickets, getTicketDays, resendInvitation, type Ticket } from "@services/ticket.service";
import { listUsers } from "@services/user.service";
import { listCustomers } from "@services/orders.service";
import { toCsv, downloadCsv, stamp } from "@/utils/csv";

/* El texto del correo (mismo que DEFAULT_INVITE_MESSAGE de tickets-svc). Va a
   la vista para poder ajustarlo por envío; el saludo con el nombre lo pone el
   correo solo. Párrafos separados por una línea en blanco. */
const DEFAULT_MESSAGE = [
  "La Feria del Millón tiene el gusto de invitarle a su 14.ª edición, que se realizará del 5 al 8 de noviembre de 2026 en el Antiguo Carulla Calle 100 Bogotá – Cl. 98 #17-60, con inauguración el 5 de noviembre.",
  "Confirme su asistencia y reciba su pase de acceso digital con código QR válido para el acceso a la Feria del Millón, a través de la línea oficial de WhatsApp: +57 3007485406",
].join("\n\n");

const CATEGORIES = ["VIP", "Prensa", "Coleccionista", "Comprador", "Aliado", "Artista", "Mentor", "Curador", "Asistente"];

type Base = "vip" | "mentor" | "curador" | "asistente" | "comprador";
const BASES: { key: Base; label: string }[] = [
  { key: "vip", label: "VIP" },
  { key: "mentor", label: "Mentores" },
  { key: "curador", label: "Curadores" },
  { key: "asistente", label: "Asistentes" },
  { key: "comprador", label: "Compradores" },
];

const STATUS: Record<string, { label: string; tone: PillTone }> = {
  invited: { label: "Pendiente", tone: "warn" },
  declined: { label: "Declinó", tone: "mid" },
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
  const [message, setMessage] = React.useState(DEFAULT_MESSAGE);
  const [image, setImage] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [deadline, setDeadline] = React.useState("");
  const invitees = parseInvitees(text);

  const onPickImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const r = await uploadCampaignImage(file, "invitaciones");
      setImage(r.url);
    } catch {
      toast.error("No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  };

  // ponytail: primeras 200 invitaciones (tope del backend); paginar con nextCursor si pasan de eso.
  const { data: list = [], isFetching } = useQuery({
    queryKey: ["invitations", eventId],
    queryFn: async () => (await getTickets({ eventId, type: "invitacion", limit: 200 })).data as Ticket[],
  });

  const send = useMutation({
    mutationFn: () =>
      createInvitations({
        eventId, invitees, category, admits, allDays, date: allDays ? undefined : date || undefined,
        image: image || undefined,
        message: message.trim() && message.trim() !== DEFAULT_MESSAGE ? message.trim() : undefined,
        deadline: deadline || undefined,
      }),
    onSuccess: (r) => {
      toast.success(`${r.created} invitaciones enviadas${r.skipped.length ? ` · ${r.skipped.length} omitidas (ya invitadas o inválidas)` : ""}`);
      setText("");
      qc.invalidateQueries({ queryKey: ["invitations", eventId] });
    },
    onError: () => toast.error("No se pudieron crear las invitaciones."),
  });

  const importRole = async (role: Base) => {
    const { users } = await listUsers({ roles: [role], limit: 200 });
    const lines = users.map((u: any) => `${[u.firstName, u.lastName].filter(Boolean).join(" ")}, ${u.email}`);
    // Compradores: también la base de quienes pagaron obra (compran sin cuenta).
    // El histórico 2025 no está en el sistema: se pega del Excel en la caja.
    if (role === "comprador") {
      const customers = await listCustomers().catch(() => []);
      lines.push(...customers.map((c) => `${c.name || c.email.split("@")[0]}, ${c.email}`));
    }
    const seen = new Set(parseInvitees(text).map((i) => i.email.toLowerCase()));
    const fresh = lines.filter((l) => {
      const e = parseInvitees(l)[0]?.email.toLowerCase();
      return e && !seen.has(e) && (seen.add(e), true);
    });
    setText((t) => [t.trim(), ...fresh].filter(Boolean).join("\n"));
    toast.message(`${fresh.length} contactos de ${BASES.find((b) => b.key === role)?.label} agregados`);
  };

  const hosts = list.filter((t) => !t.inviteParent);

  const exportCsv = () =>
    downloadCsv(`invitaciones_${stamp()}.csv`, toCsv(list, [
      { header: "Nombre", value: (t) => t.buyer?.name },
      { header: "Email", value: (t) => t.buyer?.email },
      // Acompañante: tiene su propio QR; aquí se ve de parte de quién va.
      { header: "Invitado por", value: (t) => t.inviteHostName },
      { header: "Teléfono", value: (t) => t.buyer?.phone, text: true },
      // Datos de la inscripción: los llena el invitado al confirmar.
      { header: "Tipo doc.", value: (t) => t.buyer?.documentType },
      { header: "Identificación", value: (t) => t.buyer?.documentNumber, text: true },
      { header: "País", value: (t) => t.buyer?.country },
      { header: "Ciudad", value: (t) => t.buyer?.city },
      { header: "Dirección", value: (t) => t.buyer?.address },
      { header: "Compañía", value: (t) => t.buyer?.company },
      { header: "Cargo", value: (t) => t.buyer?.position },
      { header: "Correo institucional", value: (t) => t.buyer?.corporateEmail },
      { header: "Aceptó datos", value: (t) => (t.buyer?.dataConsentAt ? "Sí" : "") },
      { header: "WhatsApp enviado", value: (t) => (t.whatsappSentAt ? "Sí" : "") },
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
          { label: "Enviadas", value: hosts.length },
          { label: "Confirmadas", value: hosts.filter((t) => ["sold", "checked_in"].includes(t.status)).length },
          { label: "Declinaron", value: hosts.filter((t) => t.status === "declined").length },
          { label: "Acompañantes", value: list.length - hosts.length },
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
          {/* El correo: imagen de cabecera (como el de ARTBO) y el texto. */}
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
            <Box sx={{ width: { xs: "100%", md: 220 }, flexShrink: 0 }}>
              {image ? (
                <Box sx={{ position: "relative" }}>
                  <Box component="img" src={image} alt="Imagen del correo" sx={{ width: "100%", display: "block", border: "1px solid", borderColor: "divider" }} />
                  <IconButton size="small" onClick={() => setImage("")} sx={{ position: "absolute", top: 4, right: 4, bgcolor: "background.paper" }}>
                    <X size={14} />
                  </IconButton>
                </Box>
              ) : (
                <Button component="label" variant="outlined" fullWidth startIcon={<ImagePlus size={16} />} disabled={uploading}
                  sx={{ textTransform: "none", height: 120, borderStyle: "dashed" }}>
                  {uploading ? "Subiendo…" : "Imagen del correo"}
                  <input hidden type="file" accept="image/*" onChange={(e) => onPickImage(e.target.files?.[0])} />
                </Button>
              )}
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                Va arriba, como la de ARTBO. Horizontal o cuadrada.
              </Typography>
            </Box>
            <TextField
              multiline minRows={5} size="small" fullWidth label="Texto del correo"
              value={message} onChange={(e) => setMessage(e.target.value)}
              helperText="El saludo “Apreciado(a) Nombre:” y los botones Confirmar / Declinar los pone el correo. Separe párrafos con una línea en blanco."
            />
          </Stack>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {BASES.map((b) => (
              <Button key={b.key} size="small" variant="text" startIcon={<UserPlus size={14} />} onClick={() => importRole(b.key)} sx={{ textTransform: "none" }}>
                Agregar {b.label}
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
            <Tooltip title="Pases por invitación. Doble = 2 QR: el del invitado y el de su acompañante, que deja sus datos al confirmar.">
              <TextField size="small" type="number" label="Pases (personas)" value={admits}
                onChange={(e) => setAdmits(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} sx={{ width: 140 }} />
            </Tooltip>
            <TextField size="small" type="date" label="Confirmar antes de" value={deadline}
              onChange={(e) => setDeadline(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 170 }}
              helperText="Opcional; sale en el correo" />
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
                      <Typography variant="caption" color="text.secondary" display="block">{t.buyer?.email}</Typography>
                      {t.inviteHostName && (
                        <Chip size="small" variant="outlined" label={`Acompañante de ${t.inviteHostName}`} sx={{ mt: 0.5 }} />
                      )}
                    </TableCell>
                    <TableCell>{t.inviteCategory || "—"}</TableCell>
                    {/* Lo que llenó al confirmar: sin eso, todavía no se inscribió. */}
                    <TableCell>
                      {t.buyer?.documentNumber || t.buyer?.address || t.inviteParent ? (
                        <>
                          <Typography fontSize={13}>{t.buyer?.documentNumber || "—"}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ maxWidth: 220 }}>
                            {t.buyer?.phone ? `${t.buyer.phone}${t.whatsappSentAt ? " (WhatsApp ✓)" : ""} · ` : ""}
                            {[t.buyer?.city, t.buyer?.company].filter(Boolean).join(" · ") || t.buyer?.address || ""}
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
