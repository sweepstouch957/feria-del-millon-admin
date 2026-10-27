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
import { createInviteLink, listInviteLinks, sendInviteLinkEmails, updateInviteLink, type InviteLink } from "@services/ticket.service";

/* Enlaces públicos de registro: para invitados que no están en la base con
   correo. Se imprime el enlace corto (o su QR) en una pieza y la persona se
   inscribe sola; recibe su pase con QR al instante. Cada enlace tiene cupo y
   se puede apagar. */

const base = SHOP_URL.replace(/\/+$/, "");
const shortUrl = (code: string) => `${base}/i/${code}`;
const prettyUrl = (code: string) => shortUrl(code).replace(/^https?:\/\//, "");

/* ── Empresas en lote ─────────────────────────────────────────────────────
   Una fila por empresa, pegada del Excel: "Itaú  EMPRESA  maria@itau.co  100".
   Cada empresa recibe su propio enlace con su cupo y el correo con el enlace
   para repartirlo entre sus empleados (cada uno se registra con su correo). */

const EMAIL_IN = /[^\s,;<>"'/()[\]]+@[^\s,;<>"'/()[\]]+\.[a-z]{2,}/i;
const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24).replace(/-+$/, "");

type CompanyRow = { company: string; email: string; seats: number; code: string };

function parseCompanies(text: string): CompanyRow[] {
  const out: CompanyRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split(/\t|;|,(?=\s*\S+@)|,(?=\s*\d+\s*$)/).map((c) => c.trim()).filter(Boolean);
    const email = (line.match(EMAIL_IN)?.[0] || "").toLowerCase();
    const num = [...cells].reverse().find((c) => /^\d{1,4}$/.test(c));
    const company = cells.find((c) => !EMAIL_IN.test(c) && !/^\d+$/.test(c) && !/^empresas?$/i.test(c)) || "";
    if (!company && !email) continue;
    out.push({ company, email, seats: Number(num) || 0, code: slug(company) });
  }
  return out;
}

const companyMessage = (company: string, seats: number) =>
  [
    `La Feria del Millón tiene el gusto de invitar a los colaboradores de ${company} a la 14.ª Feria del Millón, la feria que visibiliza el trabajo de artistas emergentes.`,
    `Este enlace es para su equipo: le agradecemos compartirlo con sus colaboradores. Cada persona se registra con sus datos y los de su acompañante, y cada uno recibe al instante su pase de acceso con código QR, válido para un día de la feria a su elección. Cupo: ${seats} ${seats === 1 ? "invitación" : "invitaciones"} (cada una para 2 personas).`,
    "Lugar: Cl. 97 #17-31 (Antiguo Carulla Calle 100), Bogotá\n(A 100 metros del round point de la carrera 15)",
    "Horarios de la feria:\n* Jueves 5 de noviembre: 5:00 p. m. a 10:00 p. m. (Entrada solo para mayores de edad)\n* Viernes 6 de noviembre: 12:00 p. m. a 10:00 p. m.\n* Sábado 7 de noviembre: 12:00 p. m. a 10:00 p. m.\n* Domingo 8 de noviembre: 12:00 p. m. a 10:00 p. m.",
  ].join("\n\n");

function CompanyLinksBulk({ eventId, existingCodes, onDone }: { eventId: string; existingCodes: Set<string>; onDone: () => void }) {
  const [text, setText] = React.useState("");
  const [sendMail, setSendMail] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const rows = parseCompanies(text);
  const problem = (r: CompanyRow) =>
    !r.company ? "Falta la empresa" : r.code.length < 3 ? "Nombre muy corto para el enlace" : !r.seats ? "Falta el cupo" : sendMail && !r.email ? "Falta el correo" : existingCodes.has(r.code) ? "Ya existe ese enlace" : "";
  const ok = rows.filter((r) => !problem(r));

  const run = async () => {
    if (!window.confirm(`¿Crear ${ok.length} enlace(s)${sendMail ? " y enviar a cada empresa su correo" : ""}?`)) return;
    setBusy(true);
    let created = 0;
    const failed: string[] = [];
    for (const r of ok) {
      try {
        const l = await createInviteLink({ eventId, code: r.code, label: r.company, category: "Empresa", admits: 2, maxUses: r.seats, anyDay: true });
        created++;
        // El texto del correo queda guardado en el enlace: el botón "Correo" lo reenvía igual.
        await updateInviteLink(l.id, { emailMessage: companyMessage(r.company, r.seats) });
        if (sendMail && r.email) await sendInviteLinkEmails(l.id, [r.email]);
      } catch (e: any) {
        failed.push(`${r.company}: ${e?.response?.data?.message || e?.response?.data?.error || "error"}`);
      }
    }
    setBusy(false);
    onDone();
    if (created) toast.success(`${created} enlace(s) de empresa creados${sendMail ? " y enviados" : ""}`);
    if (failed.length) toast.error(`No se pudo con: ${failed.join(" · ")}`);
    if (!failed.length) setText("");
  };

  return (
    <Box sx={{ mb: 2.5, p: 1.5, border: "1px dashed", borderColor: "divider" }}>
      <Typography fontWeight={600} fontSize={14}>Enlaces para empresas (en lote)</Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
        Pega del Excel una fila por empresa: Empresa · correo del contacto · cupo. Cada una recibe su enlace (ej. {prettyUrl("itau")}) para repartir entre sus empleados.
        El cupo es de invitaciones: cada empleado se registra con un acompañante (2 QR), así que 100 = hasta 200 personas.
      </Typography>
      <TextField
        multiline minRows={3} maxRows={10} fullWidth size="small" value={text} onChange={(e) => setText(e.target.value)}
        // El ejemplo dice que es ejemplo: en gris parecía que ya había empresas cargadas.
        placeholder={"Pega aquí las filas del Excel. Ejemplo:\nItaú        EMPRESA   maria.gomez@itau.co   100"}
      />
      {!text.trim() && (
        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          En el Excel selecciona las filas de las empresas (Empresa, EMPRESA, correo, cupo), copia (Ctrl+C) y pega aquí (Ctrl+V).
        </Typography>
      )}
      {rows.length > 0 && (
        <Table size="small" sx={{ mt: 1 }}>
          <TableHead><TableRow>
            <TableCell>Empresa</TableCell><TableCell>Enlace</TableCell><TableCell>Correo</TableCell><TableCell align="right">Cupo</TableCell><TableCell />
          </TableRow></TableHead>
          <TableBody>
            {rows.map((r, i) => {
              const p = problem(r);
              return (
                <TableRow key={i} sx={{ opacity: p ? 0.6 : 1 }}>
                  <TableCell>{r.company || "—"}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{r.code ? prettyUrl(r.code) : "—"}</TableCell>
                  <TableCell sx={{ fontSize: 12, wordBreak: "break-all" }}>{r.email || "—"}</TableCell>
                  <TableCell align="right">{r.seats || "—"}</TableCell>
                  <TableCell>{p ? <Chip size="small" color="warning" variant="outlined" label={p} /> : <Chip size="small" color="success" label="Listo" />}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <Stack direction="row" alignItems="center" gap={1.5} mt={1}>
        <Stack direction="row" alignItems="center">
          <Switch size="small" checked={sendMail} onChange={(e) => setSendMail(e.target.checked)} />
          <Typography variant="body2">Enviar a cada contacto el correo con su enlace</Typography>
        </Stack>
        <Button variant="contained" size="small" sx={{ ml: "auto" }} disabled={busy || !ok.length} onClick={run}>
          {busy ? "Creando…" : `Crear ${ok.length || ""} enlace${ok.length === 1 ? "" : "s"}`}
        </Button>
      </Stack>
    </Box>
  );
}

export default function InviteLinksCard({ eventId, defaultMessage = "" }: { eventId: string; defaultMessage?: string }) {
  const [emailFor, setEmailFor] = React.useState<InviteLink | null>(null);
  const qc = useQueryClient();
  const { data: links = [], isLoading } = useQuery({
    queryKey: ["invite-links", eventId],
    queryFn: () => listInviteLinks(eventId),
  });

  const [code, setCode] = React.useState("");
  const [label, setLabel] = React.useState("");
  // Invitado + acompañante: es el pase de casi todos los enlaces.
  const [admits, setAdmits] = React.useState(2);
  const [maxUses, setMaxUses] = React.useState(100);
  const codeBad = !!code && !/^[a-z0-9-]{3,24}$/.test(code);
  const [creating, setCreating] = React.useState<"" | "one" | "companies">("");

  const create = useMutation({
    mutationFn: () => createInviteLink({ eventId, code: code || undefined, label, admits, maxUses, anyDay: true, category: "VIP" }),
    onSuccess: (l) => {
      qc.invalidateQueries({ queryKey: ["invite-links", eventId] });
      setCode("");
      setLabel("");
      setCreating("");
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
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} gap={1} mb={2}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Link2 size={18} />
            <Typography fontWeight={600}>Enlaces creados {links.length ? `(${links.length})` : ""}</Typography>
          </Stack>
          {/* Crear va escondido: lo que más se mira es cómo van los enlaces. */}
          <Stack direction="row" gap={1} sx={{ ml: { sm: "auto" } }}>
            <Tooltip arrow title="Un enlace para un grupo (artistas, una pieza impresa…): tú eliges el código y el cupo.">
              <Button size="small" variant={creating === "one" ? "contained" : "outlined"} onClick={() => setCreating((c) => (c === "one" ? "" : "one"))} sx={{ textTransform: "none" }}>
                + Crear un enlace
              </Button>
            </Tooltip>
            <Tooltip arrow title="Pega la lista de empresas (nombre, correo, cupo): cada una recibe su propio enlace por correo para repartir entre sus empleados.">
              <Button size="small" variant={creating === "companies" ? "contained" : "outlined"} onClick={() => setCreating((c) => (c === "companies" ? "" : "companies"))} sx={{ textTransform: "none" }}>
                + Enlaces para empresas
              </Button>
            </Tooltip>
          </Stack>
        </Stack>

        {creating === "one" && (
        <Stack direction={{ xs: "column", md: "row" }} gap={1.5} alignItems={{ md: "flex-start" }} mb={2.5} sx={{ p: 1.5, border: "1px dashed", borderColor: "divider" }}>
          <Tooltip arrow placement="top" title="Lo que va al final de la dirección: feria-millon.immsai.com/i/CÓDIGO. Corto y fácil de escribir.">
          <TextField
            size="small" label="Código (lo que va en el enlace)" value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
            placeholder="artistas" error={codeBad}
            helperText={codeBad ? "3 a 24 letras minúsculas, números o guiones" : code ? prettyUrl(code) : "Vacío = uno al azar"}
            sx={{ minWidth: 230 }}
          />
          </Tooltip>
          <Tooltip arrow placement="top" title="Nombre interno para reconocerlo en la tabla. El público no lo ve.">
          <TextField size="small" label="Para quién (solo lo ves tú)" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Artistas Salón Colombia" sx={{ flex: 1, minWidth: 200 }} helperText=" " />
          </Tooltip>
          <Tooltip arrow placement="top" title="Cuántas personas entran por cada registro. 2 = el que se registra y su acompañante, cada uno con su QR.">
          <TextField select size="small" label="Pase" value={admits} onChange={(e) => setAdmits(Number(e.target.value))} sx={{ minWidth: 150 }} helperText="1 día a elección">
            <MenuItem value={1}>1 persona</MenuItem>
            <MenuItem value={2}>2 personas (2 QR)</MenuItem>
          </TextField>
          </Tooltip>
          <Tooltip arrow placement="top" title="Cuántos registros acepta el enlace. Al llenarse deja de recibir; lo puedes ampliar después.">
          <TextField size="small" type="number" label="Cupo" value={maxUses} onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value) || 1))} sx={{ width: 110 }} helperText="registros" />
          </Tooltip>
          <Button variant="contained" onClick={() => create.mutate()} disabled={create.isPending || codeBad} sx={{ mt: { md: 0.25 } }}>
            {create.isPending ? "Creando…" : "Crear enlace"}
          </Button>
        </Stack>
        )}

        {creating === "companies" && (
        <CompanyLinksBulk
          eventId={eventId}
          existingCodes={new Set(links.map((l: InviteLink) => l.code))}
          onDone={() => qc.invalidateQueries({ queryKey: ["invite-links", eventId] })}
        />
        )}

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
                  <TableCell align="center"><Tooltip arrow title="Personas registradas / cupo del enlace. Toca la cifra para ampliar el cupo."><span>Registros ⓘ</span></Tooltip></TableCell>
                  <TableCell align="center"><Tooltip arrow title="Apagado, el enlace deja de recibir registros (los ya registrados conservan su pase)."><span>Activo ⓘ</span></Tooltip></TableCell>
                  <TableCell align="right"><Tooltip arrow title="Correo: envía el enlace a una o varias personas. Copiar: copia la dirección. Descargar: QR del enlace para una pieza impresa."><span>Acciones ⓘ</span></Tooltip></TableCell>
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
