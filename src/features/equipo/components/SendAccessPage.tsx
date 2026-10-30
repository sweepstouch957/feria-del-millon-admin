"use client";

import { useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, LinearProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography,
} from "@mui/material";
import PageHeader from "@/components/ui/PageHeader";
import { parseCredentials } from "../model/roster";
import { useSendAccess } from "../hooks/useSendAccess";

/** Pegar correo + contraseña de cuentas ya creadas y mandarle a cada una su correo de acceso. */
export function SendAccessPage() {
  const [text, setText] = useState("");
  const send = useSendAccess();
  const { rows, skipped } = useMemo(() => parseCredentials(text), [text]);
  const resultOf = new Map(send.results.map((r) => [r.email, r]));
  const failed = send.results.filter((r) => r.error).length;
  const done = send.results.length > 0 && !send.running;

  return (
    <Box sx={{ maxWidth: 1080, mx: "auto" }}>
      <PageHeader
        crumb="Usuarios"
        title="Enviar accesos por correo"
        description="Pega la lista de correos y contraseñas. Cada persona recibe un botón para entrar directo, más su enlace, correo y contraseña. Solo se envía si la contraseña coincide con la cuenta."
        back="/users/equipo"
        backLabel="Volver a cuentas de caja"
      />

      <Stack spacing={2.5}>
        <TextField
          multiline
          minRows={6}
          maxRows={16}
          fullWidth
          placeholder={"Nombre Apellido\tcorreo@ejemplo.com\tContraseña"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={send.running}
        />
        {skipped.length > 0 && <Alert severity="warning">Sin contraseña, no se envían: {skipped.join(" · ")}</Alert>}

        {rows.length > 0 && (
          <TableContainer sx={{ border: "1px solid", borderColor: "divider" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Correo</TableCell>
                  <TableCell>Resultado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(({ email }) => {
                  const r = resultOf.get(email);
                  return (
                    <TableRow key={email}>
                      <TableCell sx={{ wordBreak: "break-all" }}>{email}</TableCell>
                      <TableCell>
                        {r && <Chip size="small" color={r.error ? "error" : "success"} label={r.error ?? "Enviado"} />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {send.running && (
          <Box>
            <LinearProgress variant="determinate" value={(send.results.length / rows.length) * 100} />
            <Typography variant="caption" color="text.secondary">
              Enviando {send.results.length + 1} de {rows.length}…
            </Typography>
          </Box>
        )}

        {done && (
          <Alert severity={failed ? "warning" : "success"}>
            {send.results.length - failed} enviado(s), {failed} con error.
          </Alert>
        )}

        <Box>
          <Button variant="contained" size="large" disabled={!rows.length || send.running} onClick={() => send.run(rows)}>
            {send.running ? "Enviando…" : `Enviar ${rows.length} correo(s)`}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
