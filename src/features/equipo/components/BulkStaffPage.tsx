"use client";

import { useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, FormControlLabel, LinearProgress, MenuItem, Stack, Switch, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import { downloadCsv, stamp, toCsv } from "@/utils/csv";
import { parseRoster, STAFF_ROLES, type StaffRole } from "../model/roster";
import { useBulkCreateStaff, type StaffDraft, type StaffResult } from "../hooks/useBulkCreateStaff";

const LOGIN_URL = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";
const ROLE_LABEL = Object.fromEntries(STAFF_ROLES.map((r) => [r.value, r.label])) as Record<StaffRole, string>;
const STATUS: Record<StaffResult["status"], { label: string; color: "success" | "info" | "error" }> = {
  created: { label: "Creada", color: "success" },
  updated: { label: "Ya existía: se le dio el rol", color: "info" },
  error: { label: "Error", color: "error" },
};

const credsText = (r: StaffResult) =>
  `${r.firstName} ${r.lastName} (${ROLE_LABEL[r.role]})\nEntra en: ${LOGIN_URL}\nCorreo: ${r.email}\nContraseña: ${r.password}`;

/** Crear las cuentas del equipo de caja de una vez: pegar la lista, elegir rol, crear y repartir claves. */
export function BulkStaffPage() {
  const [text, setText] = useState("");
  const [defaultRole, setDefaultRole] = useState<StaffRole>("cajera");
  const [roleOf, setRoleOf] = useState<Record<string, StaffRole>>({});
  const [practice, setPractice] = useState(true);
  const bulk = useBulkCreateStaff();

  const { rows, skipped } = useMemo(() => parseRoster(text), [text]);
  const drafts: StaffDraft[] = rows.map((r) => ({ ...r, role: roleOf[r.email] ?? defaultRole }));
  const done = bulk.results.length > 0 && !bulk.running;
  const created = bulk.results.filter((r) => r.password);

  const copyAll = () => {
    navigator.clipboard?.writeText(created.map(credsText).join("\n\n"));
    toast.success("Credenciales copiadas");
  };
  const exportCsv = () =>
    downloadCsv(`cuentas_caja_${stamp()}.csv`, toCsv(bulk.results, [
      { header: "Nombre", value: (r: StaffResult) => `${r.firstName} ${r.lastName}`.trim() },
      { header: "Correo", value: (r) => r.email },
      { header: "Rol", value: (r) => ROLE_LABEL[r.role] },
      { header: "Contraseña", value: (r) => r.password ?? "(la que ya tenía)", text: true },
      { header: "Resultado", value: (r) => (r.error ? `Error: ${r.error}` : STATUS[r.status].label) },
      { header: "Entrar en", value: () => LOGIN_URL },
    ]));

  return (
    <Box sx={{ maxWidth: 1080, mx: "auto" }}>
      <PageHeader
        crumb="Usuarios"
        title="Cuentas del equipo de caja"
        description="Pega la lista (nombre y correo por línea, como sale de Excel), elige el rol de cada una y crea todas. Las contraseñas se generan solas."
        back="/users"
        backLabel="Volver a usuarios"
      />

      {!done ? (
        <Stack spacing={2.5}>
          <TextField
            multiline
            minRows={6}
            maxRows={16}
            fullWidth
            placeholder={"Nataly Ñustez González\tftnatalyngon@gmail.com\nDiego Esteban Ramos Franco\tdiegogrms123@gmail.com"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={bulk.running}
          />
          {skipped.length > 0 && (
            <Alert severity="warning">Sin correo, no se crean: {skipped.join(" · ")}</Alert>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <TextField
              select size="small" label="Rol para todas" value={defaultRole} sx={{ minWidth: 240 }}
              onChange={(e) => { setDefaultRole(e.target.value as StaffRole); setRoleOf({}); }}
            >
              {STAFF_ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </TextField>
            <FormControlLabel
              control={<Switch color="warning" checked={practice} onChange={(e) => setPractice(e.target.checked)} />}
              label="Empiezan en modo práctica (no cobran ni guardan nada hasta que lo apagues)"
            />
          </Stack>

          {drafts.length > 0 && (
            <TableContainer sx={{ border: "1px solid", borderColor: "divider" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Apellidos</TableCell>
                    <TableCell>Correo</TableCell>
                    <TableCell sx={{ width: 230 }}>Rol</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drafts.map((d) => (
                    <TableRow key={d.email}>
                      <TableCell>{d.firstName}</TableCell>
                      <TableCell>{d.lastName}</TableCell>
                      <TableCell sx={{ wordBreak: "break-all" }}>{d.email}</TableCell>
                      <TableCell>
                        <TextField
                          select size="small" fullWidth value={d.role}
                          onChange={(e) => setRoleOf((m) => ({ ...m, [d.email]: e.target.value as StaffRole }))}
                        >
                          {STAFF_ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                        </TextField>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Box>
            {STAFF_ROLES.map((r) => (
              <Typography key={r.value} variant="caption" color="text.secondary" display="block">
                <strong>{r.label}:</strong> {r.hint}.
              </Typography>
            ))}
          </Box>

          {bulk.running && (
            <Box>
              <LinearProgress variant="determinate" value={(bulk.results.length / drafts.length) * 100} />
              <Typography variant="caption" color="text.secondary">
                Creando {bulk.results.length + 1} de {drafts.length}…
              </Typography>
            </Box>
          )}

          <Box>
            <Button
              variant="contained" size="large"
              disabled={!drafts.length || bulk.running}
              onClick={() => bulk.run(drafts, practice)}
            >
              {bulk.running ? "Creando…" : `Crear ${drafts.length} cuenta(s)`}
            </Button>
          </Box>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Alert severity="success">
            Listo: {bulk.results.filter((r) => r.status === "created").length} creada(s),{" "}
            {bulk.results.filter((r) => r.status === "updated").length} ya existían,{" "}
            {bulk.results.filter((r) => r.status === "error").length} con error. Guarda las contraseñas ahora: después no se pueden volver a ver.
          </Alert>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="contained" startIcon={<Copy size={15} />} onClick={copyAll} disabled={!created.length}>
              Copiar todas las credenciales
            </Button>
            <Button variant="outlined" onClick={exportCsv}>Descargar Excel</Button>
            <Button onClick={() => { bulk.reset(); setText(""); setRoleOf({}); }}>Crear otra lista</Button>
          </Stack>

          <TableContainer sx={{ border: "1px solid", borderColor: "divider" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Correo</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Contraseña</TableCell>
                  <TableCell>Resultado</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {bulk.results.map((r) => (
                  <TableRow key={r.email}>
                    <TableCell>{`${r.firstName} ${r.lastName}`.trim()}</TableCell>
                    <TableCell sx={{ wordBreak: "break-all" }}>{r.email}</TableCell>
                    <TableCell>{ROLE_LABEL[r.role]}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>{r.password ?? "—"}</TableCell>
                    <TableCell>
                      <Chip size="small" color={STATUS[r.status].color} label={r.error ? `Error: ${r.error}` : STATUS[r.status].label} />
                    </TableCell>
                    <TableCell>
                      {r.password && (
                        <Button
                          size="small"
                          onClick={() => { navigator.clipboard?.writeText(credsText(r)); toast.success("Copiado"); }}
                        >
                          Copiar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary">
            Siguiente paso: en Ferias → cada pabellón → Cajeros, asigna a cada cajera su pabellón. Sin pabellón asignado cobra
            obras de todos. El día de la feria apaga el modo práctica de cada una en Usuarios.
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
