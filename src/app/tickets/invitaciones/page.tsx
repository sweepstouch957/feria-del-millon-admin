"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, Button, TextField, MenuItem, Chip, ToggleButton, ToggleButtonGroup,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, LinearProgress, IconButton, Tooltip,
  Checkbox, FormControlLabel, TablePagination, InputAdornment,
} from "@mui/material";
import { useDebouncedValue } from "@/hooks/useAuth";
import { FileUp, ImagePlus, Search, Send, UserPlus, X } from "lucide-react";
import { uploadCampaignImage } from "@services/upload.service";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import StatusPill, { type PillTone } from "@/components/ui/StatusPill";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { createInvitations, getTicketDays, getInvitationsAdmin, getInvitedEmails, previewInvitation, resendInvitation, resendPendingInvitations, requestCompanion, sendInvitationTest, type InvitationStatusFilter, type Ticket } from "@services/ticket.service";
import { useAuth } from "@/provider/authProvider";
import InviteLinksCard from "@/components/admin/tickets/InviteLinksCard";
import { listUsers } from "@services/user.service";
import { listCustomers } from "@services/orders.service";

/* El texto del correo (mismo que DEFAULT_INVITE_MESSAGE de tickets-svc). Va a
   la vista para poder ajustarlo por envío; el saludo con el nombre lo pone el
   correo solo. Párrafos separados por una línea en blanco. */
const DEFAULT_MESSAGE = [
  "Nos complace darle la bienvenida como invitado especial a la 14.ª Feria del Millón, la feria que visibiliza el trabajo de artistas emergentes. Queremos ofrecerle un acceso preferencial para que disfrute de este espacio en una nueva locación.",
  "Lugar: Cl. 97 #17-31 (Antiguo Carulla Calle 100), Bogotá\n(A 100 metros del round point de la carrera 15)",
  "Horarios de la feria:\n* Jueves 5 de noviembre: 5:00 p. m. a 10:00 p. m. (Entrada solo para mayores de edad)\n* Viernes 6 de noviembre: 12:00 p. m. a 10:00 p. m.\n* Sábado 7 de noviembre: 12:00 p. m. a 10:00 p. m.\n* Domingo 8 de noviembre: 12:00 p. m. a 10:00 p. m.",
  "Lo esperamos en la feria.",
].join("\n\n");

/** Pieza gráfica de la invitación (misma que DEFAULT_INVITE_IMAGE en tickets-svc). */
const DEFAULT_IMAGE = "https://res.cloudinary.com/dg9gzic4s/image/upload/w_1120,q_auto,f_auto/v1792793743/feria-del-millon/invitaciones/jgym7rbvclzhxfj5xwvc.jpg";

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
const EMAIL_IN = /[^\s,;<>"'/()[\]]+@[^\s,;<>"'/()[\]]+\.[a-z]{2,}(?![a-z0-9-])/i;
const EMAIL_ALL = new RegExp(EMAIL_IN.source, "gi");
// Celdas que no son nombre: número de fila, etiquetas como "INVITADO ESPECIAL".
const isNoise = (c: string) => /^\d+$/.test(c) || /^invitad[oa]s?\s+especial(es)?$/i.test(c);
// Fila de encabezado de Excel: "Nombre  Apellido  Correo".
const isHeader = (l: string) => /^(#\s*)?(nombres?|name)\b.*\b(correo|e-?mail)\b/i.test(l.replace(/\s+/g, " "));
// Espacios raros de Excel (dobles, no separables, invisibles) → uno solo.
const cleanText = (s: string) => s.replace(/[\s\u00a0\u200b\ufeff]+/g, " ").replace(/\s*\/\s*/g, " / ").trim();
// "DANIEL RIPOLL" → "Daniel Ripoll"; deja igual lo que ya viene en mayúsculas y minúsculas.
const titleIfShouting = (s: string) =>
  s
    .split(" ")
    .map((w) => (w.length > 1 && w === w.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(w) ? w[0] + w.slice(1).toLowerCase() : w))
    .join(" ");

type Contact = { firstName?: string; lastName?: string; phone?: string; city?: string; address?: string };
type ParsedInvitee = Contact & { name: string; email: string; extraEmails: number; brokenEmail: boolean };

const norm = (v: any) => String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
// Celular o fijo: 7 o más dígitos, con espacios, guiones o "+".
const isPhone = (c: string) => /^\+?[\d\s().-]{7,20}$/.test(c) && c.replace(/\D/g, "").length >= 7;

/** Columnas de un encabezado de Excel (Nombre, Apellido, Teléfono, Correo, Ciudad, Dirección). */
type Cols = { name: number; last: number; phone: number; mail: number; city: number; addr: number };
function headerCols(cells: string[]): Cols | null {
  const h = cells.map(norm);
  const col = (re: RegExp) => h.findIndex((x) => re.test(x));
  const mail = col(/^(correo|email|e-mail|mail)/);
  if (mail < 0) return null;
  return {
    name: col(/^(nombres?|name)$/), last: col(/^(apellidos?|last ?name)$/), mail,
    phone: col(/^(telefono|celular|movil|whatsapp|phone)/), city: col(/^(ciudad|city)$/), addr: col(/^(direccion|address)/),
  };
}

/** Una fila en celdas → invitado. Con encabezado, por columna; sin él, por
 *  posición: antes del correo van nombre(s) y teléfono, después ciudad y dirección. */
function parseCells(raw: string[], cols: Cols | null): ParsedInvitee {
  const cells = raw.map((c) => cleanText(String(c ?? "")));
  const line = cells.join(" ");
  const emails = line.match(EMAIL_ALL) || [];
  const email = (emails[0] || "").toLowerCase();
  const at = (i: number) => (i >= 0 ? cells[i] || "" : "");
  let c: Contact;
  let fullName = "";
  if (cols) {
    c = { firstName: at(cols.name), lastName: at(cols.last), phone: at(cols.phone), city: at(cols.city), address: at(cols.addr) };
    // Sin columna de apellido no se sabe dónde parte el nombre: va entero.
    if (cols.last < 0) { fullName = c.firstName || ""; c.firstName = ""; }
  } else {
    const e = cells.findIndex((x) => EMAIL_IN.test(x));
    // La celda del correo también puede traer el nombre ("Diego diego@x.co").
    const before = (e >= 0 ? [...cells.slice(0, e), cells[e]] : cells)
      .map((x) => x.replace(EMAIL_ALL, " ").replace(/^\/|\/$/g, "").trim())
      // Un "correo" sin dominio completo (x@empresa-co) no va al nombre.
      .filter((x) => x && x !== "/" && !/\S+@\S+/.test(x));
    const phone = before.find(isPhone) || "";
    const names = before.filter((x) => !isPhone(x) && !isNoise(x));
    const after = e >= 0 ? cells.slice(e + 1) : [];
    // Sin columna de ciudad, lo que parece dirección (tiene números) es dirección.
    const cityLooksAddress = /\d/.test(after[0] || "");
    // Dos celdas = nombre y apellido; una sola ("Diego Garzón") va entera.
    if (names.length !== 2) fullName = names.join(" ");
    c = {
      ...(names.length === 2 ? { firstName: names[0], lastName: names[1] } : {}),
      phone,
      city: cityLooksAddress ? "" : after[0] || "",
      address: (cityLooksAddress ? after : after.slice(1)).filter(Boolean).join(" "),
    };
  }
  const firstName = titleIfShouting(c.firstName || "");
  const lastName = titleIfShouting(c.lastName || "");
  const name = titleIfShouting(cleanText(fullName || [firstName, lastName].filter(Boolean).join(" "))) || email.split("@")[0];
  return {
    name, email, firstName, lastName, phone: c.phone, city: c.city, address: c.address,
    extraEmails: Math.max(emails.length - 1, 0), brokenEmail: !email && /\S@\S/.test(line),
  };
}

/** Una línea por invitado. Acepta "Nombre, correo", "Nombre Apellido correo" o
 *  filas pegadas de Excel (columnas con tabulador, número de fila, encabezado,
 *  dos correos en la misma celda). Usa el primer correo válido de cada fila.
 *  Si se pega el encabezado, las columnas se toman de ahí. */
function parseInvitees(text: string): ParsedInvitee[] {
  let cols: Cols | null = null;
  const out: ParsedInvitee[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l) continue;
    const tabbed = raw.includes("\t");
    if (isHeader(l)) {
      if (tabbed) cols = headerCols(raw.split("\t"));
      continue;
    }
    out.push(parseCells(tabbed ? raw.split("\t") : l.split(/[,;<>|]+/), tabbed ? cols : null));
  }
  return out;
}

/** Lee un .xlsx / .xls / .csv: columnas por encabezado (o, sin él, por posición). */
async function readInviteesFile(file: File): Promise<ParsedInvitee[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const out: ParsedInvitee[] = [];
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sheetName], { header: 1, defval: "", raw: false });
    const hi = rows.findIndex((r) => r.some((c) => /^(correo|email|e-mail|mail)/.test(norm(c))));
    const cols = hi >= 0 ? headerCols(rows[hi].map((c) => String(c ?? ""))) : null;
    for (const r of rows.slice(hi + 1)) {
      const p = parseCells(r.map((c: any) => String(c ?? "")), cols);
      if (p.email) out.push(p);
    }
  }
  return out;
}

/** De vuelta a una línea de la caja de texto (con tabuladores, como Excel). */
const toLine = (p: ParsedInvitee) =>
  (p.firstName && p.lastName ? [p.firstName, p.lastName] : [p.name, ""]).concat([p.phone || "", p.email, p.city || "", p.address || ""]).join("\t");

/** Un paso del formulario: número, título, pista y su contenido. */
function Step({ n, title, hint, last, children }: { n: number; title: string; hint?: string; last?: boolean; children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", gap: 2, pb: last ? 0 : 3, mb: last ? 0 : 3, borderBottom: last ? 0 : "1px solid", borderColor: "divider" }}>
      <Box
        sx={{
          width: 28, height: 28, flexShrink: 0, borderRadius: "50%", display: "grid", placeItems: "center",
          bgcolor: "secondary.main", color: "secondary.contrastText", fontSize: 13, fontWeight: 700,
        }}
      >
        {n}
      </Box>
      <Box flex={1} minWidth={0}>
        <Typography fontSize={15.5} fontWeight={600}>{title}</Typography>
        {hint && <Typography variant="body2" color="text.secondary" mb={1.25}>{hint}</Typography>}
        <Box mt={hint ? 0 : 1.25}>{children}</Box>
      </Box>
    </Box>
  );
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
  const [dayMode, setDayMode] = React.useState<"any" | "one" | "all">("any");
  const allDays = dayMode === "all";
  const [admits, setAdmits] = React.useState(2);
  const [message, setMessage] = React.useState(DEFAULT_MESSAGE);
  const [image, setImage] = React.useState(DEFAULT_IMAGE);
  const [uploading, setUploading] = React.useState(false);
  const [deadline, setDeadline] = React.useState("2026-11-01");
  const invitees = parseInvitees(text);

  // Importar un Excel/CSV: se agregan a la lista (sin repetir correos) para revisarlos antes de enviar.
  const [importingFile, setImportingFile] = React.useState(false);
  const onPickFile = async (file?: File) => {
    if (!file) return;
    setImportingFile(true);
    try {
      const rows = await readInviteesFile(file);
      const seen = new Set(parseInvitees(text).map((i) => i.email.toLowerCase()));
      const fresh: string[] = [];
      let dup = 0;
      for (const r of rows) {
        if (seen.has(r.email)) { dup++; continue; }
        seen.add(r.email);
        fresh.push(toLine(r));
      }
      setText((t) => [t.trim(), ...fresh].filter(Boolean).join("\n"));
      if (!rows.length) toast.error("No encontramos correos en el archivo. Revise que tenga una columna de correo.");
      else toast.success(`${fresh.length} invitados agregados desde ${file.name}${dup ? ` · ${dup} correos repetidos omitidos` : ""}`);
    } catch {
      toast.error("No pudimos leer el archivo. Use .xlsx, .xls o .csv.");
    } finally {
      setImportingFile(false);
    }
  };
  // Un correo una sola vez: repetirlo en la misma lista reiniciaría su propia invitación.
  const validInvitees = invitees.filter(
    (i, idx) => i.email && invitees.findIndex((j) => j.email.toLowerCase() === i.email.toLowerCase()) === idx,
  );
  const invalidLines = invitees.filter((i) => !i.email).length;
  const repeatedLines = invitees.length - validInvitees.length - invalidLines;
  const [showSummary, setShowSummary] = React.useState(true);
  const dayLabel = allDays
    ? "todos los días"
    : dayMode === "any"
      ? "un día a elección"
      : days.find((d) => d.date === date)?.display || (date ? date : "día de inauguración");

  // "Así le llega": el HTML real del correo, pedido al servidor cuando el texto se asienta.
  // Como texto: un objeto nuevo en cada render no dejaría asentarse al debounce.
  const previewKey = useDebouncedValue(
    JSON.stringify({ eventId, image: image || undefined, message: message.trim() || undefined, admits, deadline: deadline || undefined, name: validInvitees[0]?.name }),
    500,
  );
  // Prueba: los mismos correos, con este borrador, a quien los quiera revisar.
  const { user } = useAuth() as any;
  const [testEmails, setTestEmails] = React.useState<string>("");
  React.useEffect(() => {
    if (!testEmails && user?.email) setTestEmails(user.email);
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps
  const [testKinds, setTestKinds] = React.useState({ invitation: true, pass: true });
  const testList = testEmails.split(/[\s,;]+/).map((e) => e.trim()).filter((e) => /\S+@\S+\.\S+/.test(e));
  const sendTest = useMutation({
    mutationFn: () =>
      sendInvitationTest({
        eventId,
        emails: testList,
        kinds: (Object.keys(testKinds) as ("invitation" | "pass")[]).filter((k) => testKinds[k]),
        image: image || undefined,
        message: message.trim() || undefined,
        admits,
        deadline: deadline || undefined,
        allDays,
        anyDay: dayMode === "any",
        name: validInvitees[0]?.name,
      }),
    onSuccess: (r) =>
      r.failed.length
        ? toast.error(`No se pudo enviar a ${r.failed.map((f) => f.email).join(", ")}`)
        : toast.success(`Prueba enviada a ${r.sent.join(", ")}`),
    onError: (e: any) => toast.error(e?.response?.data?.error || "No se pudo enviar la prueba"),
  });

  const preview = useQuery({
    queryKey: ["invitation-preview", previewKey],
    queryFn: () => previewInvitation(JSON.parse(previewKey)),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });

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

  // Invitaciones enviadas: paginadas en el servidor, con búsqueda y filtro por estado.
  const [listPage, setListPage] = React.useState(0);
  const [listLimit, setListLimit] = React.useState(50);
  const [listStatus, setListStatus] = React.useState<InvitationStatusFilter>("");
  const [listQ, setListQ] = React.useState("");
  const listQDebounced = useDebouncedValue(listQ.trim(), 350);
  React.useEffect(() => setListPage(0), [listQDebounced, listStatus, listLimit]);
  const { data: listData, isFetching } = useQuery({
    queryKey: ["invitations", eventId, "list", listPage, listLimit, listStatus, listQDebounced],
    queryFn: () => getInvitationsAdmin({ eventId, page: listPage + 1, limit: listLimit, status: listStatus, q: listQDebounced || undefined }),
    placeholderData: (prev) => prev,
  });
  const list = (listData?.rows || []) as Ticket[];
  const stats = listData?.stats;

  // Todos los correos ya invitados (no solo la página visible), para el resumen antes de enviar.
  const { data: invitedList = [] } = useQuery({
    queryKey: ["invitations", eventId, "emails"],
    queryFn: () => getInvitedEmails(eventId),
  });
  const invitedEmails = React.useMemo(() => new Set(invitedList), [invitedList]);
  const alreadyInvited = validInvitees.filter((i) => invitedEmails.has(i.email.toLowerCase())).length;
  const newInvitees = validInvitees.length - alreadyInvited;
  const summaryRows = invitees.map((r, idx) => {
    const e = r.email.toLowerCase();
    if (!r.email) return { ...r, send: false, label: r.brokenEmail ? "Correo incompleto · se omite" : "Sin correo · se omite", tone: "warning" as const };
    if (invitees.findIndex((j) => j.email.toLowerCase() === e) !== idx) return { ...r, send: false, label: "Repetido · se omite", tone: "default" as const };
    const extra = r.extraEmails ? ` · usa el 1.er correo` : "";
    if (invitedEmails.has(e)) return { ...r, send: true, label: `Ya invitado · solo se actualizan datos${extra}`, tone: "info" as const };
    return { ...r, send: true, label: `Nueva invitación${extra}`, tone: "success" as const };
  });

  const send = useMutation({
    mutationFn: () =>
      createInvitations({
        eventId, invitees, category, admits, allDays, anyDay: dayMode === "any", date: dayMode === "one" ? date || undefined : undefined,
        image: image || undefined,
        message: message.trim() && message.trim() !== DEFAULT_MESSAGE ? message.trim() : undefined,
        deadline: deadline || undefined,
      }),
    onSuccess: (r) => {
      toast.success(
        `${r.created} invitaciones enviadas` +
          (r.updated?.length ? ` · ${r.updated.length} ya invitados: datos actualizados, sin reenviar` : "") +
          (r.skipped.length ? ` · ${r.skipped.length} omitidas (inválidas)` : ""),
      );
      setText("");
      qc.invalidateQueries({ queryKey: ["invitations", eventId] });
    },
    onError: () => toast.error("No se pudieron crear las invitaciones."),
  });

  const remind = useMutation({
    mutationFn: () => resendPendingInvitations(eventId),
    onSuccess: (r) => toast.success(`Recordatorio en camino a ${r.total} ${r.total === 1 ? "persona" : "personas"} sin confirmar`),
    onError: () => toast.error("No se pudo enviar el recordatorio."),
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

  const [exporting, setExporting] = React.useState(false);
  // Exporta TODAS las invitaciones del filtro actual, no solo la página.
  // Reporte completo del evento (no solo lo filtrado): resumen con KPIs y gráficos + una hoja por estado.
  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = (await getInvitationsAdmin({ eventId, all: true })).rows as Ticket[];
      const { downloadInvitationsReport } = await import("@/utils/invitationsReport");
      await downloadInvitationsReport(all);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo exportar");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      <PageHeader
        crumb="Boletos"
        title="Invitaciones"
        description="El invitado recibe un correo con botón de confirmación; al confirmar recibe su QR."
        actions={[
          {
            label: exporting ? "Exportando…" : "Exportar Excel",
            kind: "sec",
            disabled: exporting || !listData?.total,
            onClick: exportCsv,
          },
        ]}
      />

      <KpiStrip
        items={[
          { label: "Enviadas", value: stats?.sent ?? "…" },
          { label: "Pendientes", value: stats?.pending ?? "…" },
          { label: "Confirmadas", value: stats?.confirmed ?? "…" },
          { label: "Declinaron", value: stats?.declined ?? "…" },
          { label: "Acompañantes", value: stats?.companions ?? "…" },
          { label: "Asistieron", value: stats?.attended ?? "…", accent: true },
          { label: "En este envío", value: invitees.length },
        ]}
      />

      {/* Nueva invitación: tres pasos a la izquierda, "así le llega" a la derecha. */}
      <Box
        sx={{
          display: "grid",
          gap: 3,
          mb: 3,
          alignItems: "start",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1.15fr) minmax(0,1fr)" },
        }}
      >
        <Card><CardContent>
          <Typography sx={{ fontSize: 19, mb: 0.5 }}>Nueva invitación</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Cada invitado recibe un correo con <b>Confirmar</b> o <b>Declinar</b>. Al confirmar llena sus datos y le llega su
            pase con QR por correo y WhatsApp.
          </Typography>

          {/* 1 · A quién */}
          <Step n={1} title="¿A quién invitas?" hint="Uno por línea: Nombre, correo. O pega filas de un Excel / importa el archivo con columnas Nombre, Apellido, Teléfono, Correo, Ciudad y Dirección. Si el correo ya fue invitado, solo se actualizan sus datos (no se le reenvía).">
            <TextField
              multiline minRows={5} maxRows={12} fullWidth size="small"
              placeholder={"Diego Garzón, diego@correo.com\nNombre\tApellido\tTeléfono\tCorreo\tCiudad\tDirección  ← o pegado de Excel"}
              value={text} onChange={(e) => setText(e.target.value)}
            />
            <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1} mt={1}>
              <Chip size="small" color={validInvitees.length ? "secondary" : "default"} label={`${validInvitees.length} con correo válido`} />
              {invalidLines > 0 && <Chip size="small" color="warning" variant="outlined" label={`${invalidLines} sin correo (se omiten)`} />}
              {repeatedLines > 0 && <Chip size="small" variant="outlined" label={`${repeatedLines} repetidos (se envía una vez)`} />}
              {alreadyInvited > 0 && <Chip size="small" color="info" variant="outlined" label={`${alreadyInvited} ya invitados (solo se actualizan datos)`} />}
              <Button component="label" size="small" variant="outlined" startIcon={<FileUp size={14} />} sx={{ textTransform: "none" }} disabled={importingFile}>
                {importingFile ? "Leyendo archivo…" : "Importar Excel o CSV"}
                <input hidden type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { onPickFile(e.target.files?.[0]); e.target.value = ""; }} />
              </Button>
              {!!text.trim() && <Button size="small" onClick={() => setText("")} sx={{ textTransform: "none", ml: "auto" }}>Vaciar lista</Button>}
            </Stack>

            {/* Resumen: a quién se le va a enviar, fila por fila */}
            {invitees.length > 0 && (
              <Box sx={{ mt: 1.5, border: "1px solid", borderColor: "divider" }}>
                <Stack direction="row" alignItems="center" sx={{ px: 1.5, py: 1, borderBottom: showSummary ? "1px solid" : 0, borderColor: "divider" }}>
                  <Typography fontSize={13} fontWeight={600}>
                    Se enviará a {newInvitees} {newInvitees === 1 ? "persona" : "personas"}
                    {alreadyInvited > 0 && ` · ${alreadyInvited} se actualizan sin reenviar`}
                  </Typography>
                  <Button size="small" onClick={() => setShowSummary((v) => !v)} sx={{ ml: "auto", textTransform: "none" }}>
                    {showSummary ? "Ocultar" : "Ver lista"}
                  </Button>
                </Stack>
                {showSummary && (
                  <TableContainer sx={{ maxHeight: 320 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 44 }}>#</TableCell>
                          <TableCell>Nombre</TableCell>
                          <TableCell>Correo</TableCell>
                          <TableCell>Teléfono · ciudad · dirección</TableCell>
                          <TableCell>Estado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {summaryRows.map((r, i) => (
                          <TableRow key={i} sx={{ opacity: r.send ? 1 : 0.55 }}>
                            <TableCell sx={{ color: "text.secondary" }}>{i + 1}</TableCell>
                            <TableCell>{r.name || "—"}</TableCell>
                            <TableCell sx={{ wordBreak: "break-all" }}>{r.email || "—"}</TableCell>
                            <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>{[r.phone, r.city, r.address].filter(Boolean).join(" · ") || "—"}</TableCell>
                            <TableCell>
                              <Chip size="small" variant={r.send ? "filled" : "outlined"} color={r.tone} label={r.label} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" display="block" mt={1.5} mb={0.5}>
              O trae contactos de las bases:
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {BASES.map((b) => (
                <Chip key={b.key} icon={<UserPlus size={13} />} label={b.label} variant="outlined" onClick={() => importRole(b.key)} />
              ))}
            </Stack>
          </Step>

          {/* 2 · El pase */}
          <Step n={2} title="¿Qué pase reciben?">
            <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>Personas por invitación</Typography>
            <ToggleButtonGroup exclusive size="small" value={admits} onChange={(_, v) => v && setAdmits(v)}>
              <ToggleButton value={1} sx={{ textTransform: "none", px: 2 }}>Personal · 1 QR</ToggleButton>
              <ToggleButton value={2} sx={{ textTransform: "none", px: 2 }}>Doble · 2 QR</ToggleButton>
              <ToggleButton value={3} sx={{ textTransform: "none", px: 2 }}>3</ToggleButton>
              <ToggleButton value={4} sx={{ textTransform: "none", px: 2 }}>4</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
              {admits === 1
                ? "Solo el invitado."
                : `El invitado y ${admits === 2 ? "su acompañante" : `${admits - 1} acompañantes`}: cada uno recibe su propio QR. Los datos del acompañante los llena el invitado al confirmar.`}
            </Typography>

            <Typography variant="caption" color="text.secondary" display="block" mt={2.5} mb={0.75}>¿Qué días puede entrar?</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} alignItems={{ sm: "center" }}>
              <ToggleButtonGroup exclusive size="small" value={dayMode} onChange={(_, v) => v && setDayMode(v)}>
                <ToggleButton value="any" sx={{ textTransform: "none", px: 2 }}>Un día a elección</ToggleButton>
                <ToggleButton value="one" sx={{ textTransform: "none", px: 2 }}>Un día fijo</ToggleButton>
                <ToggleButton value="all" sx={{ textTransform: "none", px: 2 }}>Todos los días</ToggleButton>
              </ToggleButtonGroup>
              {dayMode === "one" && (
                <TextField select size="small" value={date} onChange={(e) => setDate(e.target.value)} sx={{ minWidth: 220 }}
                  SelectProps={{ displayEmpty: true }}>
                  <MenuItem value="">Inauguración (primer día)</MenuItem>
                  {days.map((d) => <MenuItem key={d.date} value={d.date}>{d.display || d.date}</MenuItem>)}
                </TextField>
              )}
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} gap={2} mt={2.5}>
              <TextField select size="small" label="Categoría" value={category} onChange={(e) => setCategory(e.target.value)}
                sx={{ minWidth: 200 }} helperText="Para ordenar y filtrar; el invitado no la ve">
                {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <TextField size="small" type="date" label="Confirmar antes de (opcional)" value={deadline}
                onChange={(e) => setDeadline(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 220 }}
                helperText="Sale en el correo; no bloquea a quien confirme tarde" />
            </Stack>
          </Step>

          {/* 3 · El correo */}
          <Step n={3} title="El correo" hint="El saludo con el nombre y los botones Confirmar / Declinar los pone el correo solo." last>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
              <Box sx={{ width: { xs: "100%", sm: 180 }, flexShrink: 0 }}>
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
                    {uploading ? "Subiendo…" : "Subir imagen"}
                    <input hidden type="file" accept="image/*" onChange={(e) => onPickImage(e.target.files?.[0])} />
                  </Button>
                )}
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  Opcional. Va arriba del texto (la pieza de la feria).
                </Typography>
              </Box>
              <Box flex={1} width="100%">
                <TextField
                  multiline minRows={6} fullWidth size="small" label="Texto"
                  value={message} onChange={(e) => setMessage(e.target.value)}
                  helperText="Separe los párrafos con una línea en blanco."
                />
                {message.trim() !== DEFAULT_MESSAGE && (
                  <Button size="small" onClick={() => setMessage(DEFAULT_MESSAGE)} sx={{ textTransform: "none", mt: 0.5 }}>
                    Volver al texto original
                  </Button>
                )}
              </Box>
            </Stack>
          </Step>
        </CardContent></Card>

        {/* Así le llega + resumen y envío */}
        <Box sx={{ position: { lg: "sticky" }, top: { lg: 88 } }}>
          <Card><CardContent>
            <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Así le llega el correo
            </Typography>
            <Box sx={{ mt: 1, border: "1px solid", borderColor: "divider", bgcolor: "#ECECEC", position: "relative" }}>
              {preview.isFetching && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 2 }} />}
              {preview.data ? (
                <iframe title="Vista previa del correo" srcDoc={preview.data} style={{ width: "100%", height: 520, border: 0, display: "block" }} />
              ) : (
                <Box sx={{ height: 520, display: "grid", placeItems: "center", color: "text.secondary", fontSize: 13 }}>
                  {preview.isError ? "No se pudo cargar la vista previa." : "Cargando vista previa…"}
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 2, p: 2, border: "1px solid", borderColor: "divider" }}>
              <Typography fontSize={14} fontWeight={600} mb={0.5}>Enviar prueba</Typography>
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                Llega con el asunto “[PRUEBA]”, este texto e imagen, y un QR de muestra. No crea invitaciones; los botones del correo no confirman nada.
              </Typography>
              <TextField
                size="small" fullWidth label="Correos (separados por coma)" value={testEmails}
                onChange={(e) => setTestEmails(e.target.value)}
                placeholder="disenadora@correo.com, admin@correo.com"
                helperText={testList.length > 10 ? "Máximo 10 correos" : `${testList.length} correo${testList.length === 1 ? "" : "s"}`}
                error={testList.length > 10}
              />
              <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1} mt={1}>
                <FormControlLabel control={<Checkbox size="small" checked={testKinds.invitation} onChange={(e) => setTestKinds((k) => ({ ...k, invitation: e.target.checked }))} />} label="Invitación" />
                <FormControlLabel control={<Checkbox size="small" checked={testKinds.pass} onChange={(e) => setTestKinds((k) => ({ ...k, pass: e.target.checked }))} />} label="Pase con QR" />
                <Button
                  variant="outlined" size="small" startIcon={<Send size={14} />} sx={{ ml: "auto" }}
                  disabled={!testList.length || testList.length > 10 || (!testKinds.invitation && !testKinds.pass) || sendTest.isPending}
                  onClick={() => sendTest.mutate()}
                >
                  {sendTest.isPending ? "Enviando…" : "Enviar prueba"}
                </Button>
              </Stack>
            </Box>

            <Box sx={{ mt: 2, p: 2, border: "1px solid", borderColor: "divider" }}>
              <Typography fontSize={14} fontWeight={600} mb={0.5}>Resumen</Typography>
              <Typography variant="body2" color="text.secondary">
                {validInvitees.length
                  ? `${validInvitees.length} invitación${validInvitees.length === 1 ? "" : "es"} · ${category} · ${admits === 1 ? "personal (1 QR)" : `${admits} QR por invitación`} · ${dayLabel}${deadline ? ` · confirmar antes del ${new Date(`${deadline}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long" })}` : ""}`
                  : "Agrega al menos un invitado con correo en el paso 1."}
              </Typography>
              <Button
                fullWidth variant="contained" size="large" startIcon={<Send size={16} />} sx={{ textTransform: "none", mt: 2 }}
                disabled={!validInvitees.length || send.isPending || uploading}
                onClick={() => {
                  const what = [
                    newInvitees ? `enviar ${newInvitees} invitación(es) (los correos salen de inmediato)` : "",
                    alreadyInvited ? `actualizar los datos de ${alreadyInvited} ya invitado(s)` : "",
                  ].filter(Boolean).join(" y ");
                  if (window.confirm(`¿${what[0].toUpperCase()}${what.slice(1)}?`)) send.mutate();
                }}
              >
                {send.isPending
                  ? "Enviando…"
                  : newInvitees
                    ? `Enviar ${newInvitees} invitación${newInvitees === 1 ? "" : "es"}${alreadyInvited ? ` · actualizar ${alreadyInvited}` : ""}`
                    : alreadyInvited
                      ? `Actualizar datos de ${alreadyInvited}`
                      : "Enviar invitaciones"}
              </Button>
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                A quien ya tiene invitación para esta feria no se le vuelve a enviar: solo se actualizan sus datos.
              </Typography>
            </Box>
          </CardContent></Card>
        </Box>
      </Box>

      <InviteLinksCard eventId={eventId} defaultMessage={DEFAULT_MESSAGE} />

      <Card>
        {isFetching && <LinearProgress />}
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} gap={1.5} sx={{ pb: 1.5, mb: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography sx={{ fontSize: 17, letterSpacing: "0.01em" }}>
              Invitaciones enviadas {listData ? <Typography component="span" color="text.secondary">({listData.total})</Typography> : null}
            </Typography>
            <TextField
              size="small" placeholder="Buscar nombre, correo o documento" value={listQ} onChange={(e) => setListQ(e.target.value)}
              sx={{ ml: { md: "auto" }, minWidth: 260 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search size={15} /></InputAdornment> }}
            />
            <TextField select size="small" label="Estado" value={listStatus} onChange={(e) => setListStatus(e.target.value as InvitationStatusFilter)} sx={{ minWidth: 170 }}>
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="pending">Pendientes</MenuItem>
              <MenuItem value="confirmed">Confirmadas</MenuItem>
              <MenuItem value="declined">Declinaron</MenuItem>
              <MenuItem value="attended">Asistieron</MenuItem>
              <MenuItem value="canceled">Anuladas</MenuItem>
            </TextField>
            {/* Recordatorio masivo: solo a quienes no han confirmado ni declinado. */}
            <Button
              size="small" variant="outlined" startIcon={<Send size={14} />} sx={{ textTransform: "none", whiteSpace: "nowrap" }}
              disabled={!stats?.pending || remind.isPending}
              onClick={() => {
                if (window.confirm(`¿Reenviar la invitación a las ${stats?.pending} personas que no han confirmado? Les llega como "Recordatorio".`)) remind.mutate();
              }}
            >
              {remind.isPending ? "Enviando…" : `Recordar a pendientes${stats?.pending ? ` (${stats.pending})` : ""}`}
            </Button>
          </Stack>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Invitado</TableCell><TableCell>Categoría</TableCell>
                <TableCell>Inscripción</TableCell><TableCell>Acompañante</TableCell>
                <TableCell align="right">Personas</TableCell><TableCell>Estado</TableCell><TableCell />
              </TableRow></TableHead>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ color: "text.secondary", py: 3 }}>
                    {listQDebounced || listStatus ? "Nada coincide con la búsqueda." : "Aún no hay invitaciones."}
                  </TableCell></TableRow>
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
                      {/* Confirmó una invitación doble sin nombrar acompañante: el cupo sigue en su QR. */}
                      {t.status === "sold" && !t.inviteParent && (t.admits ?? 1) > 1 && (
                        <Tooltip title={t.companionRequestSentAt
                          ? `Pedir acompañante otra vez (enviado ${new Date(t.companionRequestSentAt).toLocaleDateString("es-CO", { day: "numeric", month: "short" })})`
                          : "Enviar correo para agregar acompañante"}>
                          <IconButton
                            size="small"
                            color={t.companionRequestSentAt ? "default" : "primary"}
                            onClick={() => requestCompanion(t.id).then(
                              () => { toast.success(`Correo enviado a ${t.buyer?.email}`); qc.invalidateQueries({ queryKey: ["invitations", eventId] }); },
                              () => toast.error("No se pudo enviar"),
                            )}
                          >
                            <UserPlus size={14} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={listData?.total ?? 0}
            page={listPage}
            onPageChange={(_, p) => setListPage(p)}
            rowsPerPage={listLimit}
            onRowsPerPageChange={(e) => setListLimit(parseInt(e.target.value, 10))}
            rowsPerPageOptions={[25, 50, 100, 200]}
            labelRowsPerPage="Por página"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
