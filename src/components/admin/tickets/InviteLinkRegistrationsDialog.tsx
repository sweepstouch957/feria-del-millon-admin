"use client";

import * as React from "react";
import {
  Alert, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { downloadCsv, stamp, toCsv, type CsvCol } from "@/utils/csv";
import { listInviteLinkRegistrations, type InviteLink, type InviteLinkPerson } from "@services/ticket.service";

/* Quiénes se registraron por un enlace: una fila por persona (el titular y
   debajo sus acompañantes), con todo lo que llenó en el formulario. */

type Person = InviteLinkPerson & { role: string; host: string };

const when = (d?: string) => (d ? new Date(d).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" }) : "");
const attended = (p: Person) => p.status === "checked_in" || !!p.checkIns?.length;
const statusOf = (p: Person) =>
  attended(p) ? "Asistió" : p.status === "canceled" ? "Anulada" : p.status === "declined" ? "Declinó" : p.status === "invited" ? "Pendiente" : "Confirmada";

const COLS: (CsvCol<Person> & { wide?: boolean })[] = [
  { header: "Tipo", value: (p) => p.role },
  { header: "Nombre", value: (p) => p.buyer?.name, wide: true },
  { header: "Invitado por", value: (p) => p.host },
  { header: "Correo", value: (p) => p.buyer?.email, wide: true },
  { header: "Celular", value: (p) => p.buyer?.phone, text: true },
  { header: "Tipo de documento", value: (p) => p.buyer?.documentType },
  { header: "Documento", value: (p) => p.buyer?.documentNumber, text: true },
  { header: "País", value: (p) => p.buyer?.country },
  { header: "Ciudad", value: (p) => p.buyer?.city },
  { header: "Dirección", value: (p) => p.buyer?.address, wide: true },
  { header: "Empresa", value: (p) => p.buyer?.company },
  { header: "Cargo", value: (p) => p.buyer?.position },
  { header: "Correo corporativo", value: (p) => p.buyer?.corporateEmail, wide: true },
  { header: "Estado", value: statusOf },
  { header: "Ingreso a la feria", value: (p) => when(p.checkIns?.[0]?.at) },
  { header: "Personas en su QR", value: (p) => p.admits ?? 1 },
  { header: "Código", value: (p) => p.shortCode, text: true },
  { header: "Registrado", value: (p) => when(p.createdAt) },
  { header: "Autorizó datos", value: (p) => when(p.buyer?.dataConsentAt) },
  { header: "WhatsApp enviado", value: (p) => when(p.whatsappSentAt) },
];

export default function InviteLinkRegistrationsDialog({ link, onClose }: { link: InviteLink | null; onClose: () => void }) {
  const [q, setQ] = React.useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["invite-link-registrations", link?.id],
    queryFn: () => listInviteLinkRegistrations(link!.id),
    enabled: !!link,
  });

  const people = React.useMemo<Person[]>(
    () =>
      (data || []).flatMap((h) => [
        { ...h, role: "Titular", host: "" },
        ...h.companions.map((c) => ({ ...c, role: "Acompañante", host: h.buyer?.name || "" })),
      ]),
    [data],
  );
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? people.filter((p) => [p.buyer?.name, p.buyer?.email, p.buyer?.documentNumber, p.buyer?.company, p.host].some((v) => v?.toLowerCase().includes(needle)))
    : people;
  const companions = people.length - (data?.length || 0);
  const exportCsv = () => downloadCsv(`registros_${link?.code}_${stamp()}.csv`, toCsv(people, COLS));

  return (
    <Dialog open={!!link} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        Registrados en {link?.label || link?.code}
        <Typography variant="body2" color="text.secondary">
          {data ? `${data.length} titular(es) y ${companions} acompañante(s) con su propio QR.` : " "}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <Stack alignItems="center" py={4}><CircularProgress size={24} /></Stack>
        ) : isError ? (
          <Alert severity="error">No se pudieron cargar los registros.</Alert>
        ) : people.length === 0 ? (
          <Typography color="text.secondary">Nadie se ha registrado por este enlace.</Typography>
        ) : (
          <Stack spacing={1.5}>
            <TextField size="small" placeholder="Buscar por nombre, correo, documento o empresa" value={q} onChange={(e) => setQ(e.target.value)} sx={{ maxWidth: 420 }} />
            <TableContainer sx={{ maxHeight: "65vh" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {COLS.map((c) => <TableCell key={c.header} sx={{ whiteSpace: "nowrap" }}>{c.header}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shown.map((p) => (
                    <TableRow key={p.id} hover>
                      {COLS.map((c) => (
                        <TableCell key={c.header} sx={{ whiteSpace: c.wide ? "normal" : "nowrap", minWidth: c.wide ? 180 : undefined, wordBreak: c.wide ? "break-word" : undefined }}>
                          {c.header === "Tipo" ? (
                            <Chip size="small" variant={p.role === "Titular" ? "filled" : "outlined"} label={p.role} />
                          ) : (
                            String(c.value(p) ?? "") || "—"
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        <Button variant="contained" onClick={exportCsv} disabled={!people.length}>Descargar Excel</Button>
      </DialogActions>
    </Dialog>
  );
}
