"use client";

import { useState } from "react";
import {
  Alert, Button, Card, CardContent, CardHeader, Chip, LinearProgress, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { People as PeopleIcon } from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCheckins, reactivateTicket, TICKET_TYPE_LABEL } from "@services/ticket.service";
import { useActiveEvent } from "@hooks/events/useActiveEvent";
import { useCajaAccess } from "@features/caja/hooks/useCajaAccess";

const hour = (d: string) => new Date(d).toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" });

/** Quién entró hoy, a qué hora y quién lo validó; desde aquí se rehabilita un QR. */
export function CheckinsPanel() {
  const { eventId } = useActiveEvent();
  const access = useCajaAccess();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: ["checkins", eventId, q.trim()],
    queryFn: () => getCheckins({ eventId: eventId!, q: q.trim() }),
    enabled: !!eventId,
    refetchInterval: 15_000,
  });

  const reactivate = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => reactivateTicket(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checkins"] }),
  });

  const ask = (id: string, code?: string) => {
    const reason = window.prompt(`¿Por qué se vuelve a habilitar el QR ${code || ""}? (queda registrado)`);
    if (reason !== null) reactivate.mutate({ id, reason });
  };

  if (!eventId) return null;

  return (
    <Card sx={{ borderRadius: 0, border: "1px solid", borderColor: "divider", mt: 2 }}>
      <CardHeader
        avatar={<PeopleIcon />}
        title={`Ingresos de hoy${data ? ` · ${data.total}` : ""}`}
        subheader="Cada QR entra una sola vez. Se actualiza cada 15 s."
      />
      <CardContent>
        <Stack spacing={1.5}>
          <TextField
            size="small"
            label="Buscar por código o nombre"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            slotProps={{ htmlInput: { autoComplete: "off" } }}
          />
          {isFetching && <LinearProgress />}
          {reactivate.isError && <Alert severity="error">No se pudo habilitar: solo taquilla o staff pueden hacerlo.</Alert>}
          {reactivate.isSuccess && <Alert severity="info">QR habilitado de nuevo: ya puede volver a escanearse.</Alert>}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Hora</TableCell>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Validó</TableCell>
                  {access.canReactivateQr && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {!data?.rows.length ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ color: "text.secondary" }}>
                      {q ? "Nadie con ese código o nombre entró hoy." : "Aún no hay ingresos hoy."}
                    </TableCell>
                  </TableRow>
                ) : data.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{hour(r.scannedAt)}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>{r.shortCode}</TableCell>
                    <TableCell>
                      {r.name}{r.companionName ? ` + ${r.companionName}` : ""}
                      {r.admits > 1 && <Typography component="span" variant="caption" color="text.secondary"> · {r.entries}/{r.admits}</Typography>}
                      {r.reactivations > 0 && <Chip size="small" color="warning" variant="outlined" label={`rehabilitado ${r.reactivations}`} sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell>{TICKET_TYPE_LABEL[r.type] || r.type}</TableCell>
                    <TableCell>{r.scannedBy || "—"}</TableCell>
                    {access.canReactivateQr && (
                      <TableCell align="right">
                        <Button size="small" color="warning" disabled={reactivate.isPending || access.practice} onClick={() => ask(r.id, r.shortCode)}>
                          Rehabilitar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </CardContent>
    </Card>
  );
}
