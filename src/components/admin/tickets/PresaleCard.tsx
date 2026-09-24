"use client";

import * as React from "react";
import {
  Alert, Box, Button, Card, CardContent, CardHeader, Chip, CircularProgress, Divider,
  Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, RefreshCw, Save } from "lucide-react";
import { formatCOP } from "@/utils/money";
import { updateEvent } from "@services/events.service";
import {
  getTicketTypes, saveTicketTypes,
  type SaveTicketTypeInput, type TicketTypeConfig, type TicketTypeKey,
} from "@services/ticket.service";

/* Preventa de entradas: qué se vende, a qué precio, con qué cupo y entre qué
   fechas. Todo editable para no depender de un despliegue — y para poder probar
   moviendo las fechas (botones de abajo) sin tocar la base a mano. */

type Row = {
  enabled: boolean;
  price: string;
  cap: string;
  maxQty: string;
  quantities: string;
  salesFrom: string;
  salesTo: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO → valor de <input type="datetime-local"> en hora local. */
const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
const shiftDays = (days: number, hours = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(d.getHours() + hours);
  return toLocalInput(d.toISOString());
};

const rowFromConfig = (t: TicketTypeConfig): Row => ({
  enabled: t.enabled,
  price: t.price === null || t.price === undefined ? "" : String(t.price),
  cap: t.cap == null ? "" : String(t.cap),
  maxQty: t.maxQty == null ? "" : String(t.maxQty),
  quantities: (t.quantities || []).join(", "),
  salesFrom: toLocalInput(t.salesFrom),
  salesTo: toLocalInput(t.salesTo),
});

const num = (v: string) => (v.trim() === "" ? null : Number(v));

const CLOSED_LABEL: Record<string, string> = {
  disabled: "Apagado",
  not_started: "Aún no abre",
  ended: "Cerrada",
  sold_out: "Agotado",
};

export default function PresaleCard({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["ticketTypes", eventId],
    queryFn: () => getTicketTypes(eventId),
    enabled: !!eventId,
  });

  const [rows, setRows] = React.useState<Record<string, Row>>({});
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [msg, setMsg] = React.useState<{ kind: "success" | "error"; text: string } | null>(null);

  // La respuesta del servidor es la fuente de verdad: al recargar se reescriben los campos.
  React.useEffect(() => {
    if (!data) return;
    setRows(Object.fromEntries(data.types.map((t) => [t.key, rowFromConfig(t)])));
    setFrom(String(data.validFrom || "").slice(0, 10));
    setTo(String(data.validTo || "").slice(0, 10));
  }, [data]);

  const patch = (key: string, p: Partial<Row>) =>
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], ...p } }));

  const payloadFrom = (state: Record<string, Row>): SaveTicketTypeInput[] =>
    (data?.types || []).map((t) => {
      const r = state[t.key];
      const qs = r.quantities
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      return {
        key: t.key as TicketTypeKey,
        enabled: r.enabled,
        price: num(r.price),
        cap: num(r.cap),
        maxQty: num(r.maxQty),
        ...(t.quantities ? { quantities: qs } : {}),
        salesFrom: fromLocalInput(r.salesFrom),
        salesTo: fromLocalInput(r.salesTo),
      };
    });

  const save = useMutation({
    mutationFn: (state: Record<string, Row>) => saveTicketTypes(eventId, payloadFrom(state)),
    onSuccess: (res) => {
      qc.setQueryData(["ticketTypes", eventId], res);
      setMsg({ kind: "success", text: "Preventa actualizada." });
    },
    onError: (e: any) =>
      setMsg({ kind: "error", text: e?.response?.data?.error || "No se pudo guardar." }),
  });

  const saveDates = useMutation({
    mutationFn: () => updateEvent(eventId, { validFrom: from, validTo: to } as any),
    onSuccess: () => {
      setMsg({ kind: "success", text: "Fechas del evento actualizadas." });
      qc.invalidateQueries({ queryKey: ["ticketTypes", eventId] });
      qc.invalidateQueries({ queryKey: ["ticketDays"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (e: any) =>
      setMsg({ kind: "error", text: e?.response?.data?.error || "No se pudieron guardar las fechas." }),
  });

  /** Atajos de prueba: mueven la ventana de todos los tipos y guardan de una. */
  const applyWindow = (salesFrom: string, salesTo: string) => {
    const next = Object.fromEntries(
      Object.entries(rows).map(([k, r]) => [k, { ...r, salesFrom, salesTo }]),
    );
    setRows(next);
    save.mutate(next);
  };

  if (isLoading) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 0 }}>
        <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress size={24} /></Box>
      </Card>
    );
  }
  if (isError || !data) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 0 }}>
        <CardContent>
          <Alert severity="error" action={<Button onClick={() => refetch()}>Reintentar</Button>}>
            No se pudo cargar la preventa.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 0 }}>
      <CardHeader
        title="Preventa de entradas"
        subheader="Precio, cupo y ventana de venta por tipo. Campo vacío = valor por defecto (el precio del día para las de un día)."
        action={
          <Stack direction="row" spacing={1}>
            <Button size="small" startIcon={<RefreshCw size={14} />} onClick={() => refetch()} disabled={isFetching}>
              Refrescar
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<Save size={14} />}
              onClick={() => save.mutate(rows)}
              disabled={save.isPending}
            >
              Guardar
            </Button>
          </Stack>
        }
      />
      <CardContent>
        {msg && <Alert severity={msg.kind} onClose={() => setMsg(null)} sx={{ mb: 2 }}>{msg.text}</Alert>}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 64 }}>Activo</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="right" sx={{ width: 130 }}>Precio</TableCell>
              <TableCell align="right" sx={{ width: 110 }}>Cupo</TableCell>
              <TableCell align="right" sx={{ width: 120 }}>Cantidades</TableCell>
              <TableCell sx={{ width: 200 }}>Abre</TableCell>
              <TableCell sx={{ width: 200 }}>Cierra</TableCell>
              <TableCell align="right" sx={{ width: 150 }}>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.types.map((t) => {
              const r = rows[t.key];
              if (!r) return null;
              return (
                <TableRow key={t.key} hover>
                  <TableCell>
                    <Switch
                      size="small"
                      checked={r.enabled}
                      onChange={(e) => patch(t.key, { enabled: e.target.checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{t.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{t.desc}</Typography>
                    {t.requiresStudentId && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Pide foto del carné al comprar en línea.
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small" type="number" value={r.price}
                      onChange={(e) => patch(t.key, { price: e.target.value })}
                      placeholder={t.pickDay ? "precio del día" : "—"}
                      inputProps={{ min: 0, style: { textAlign: "right" } }}
                      sx={{ width: 120 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={t.cap ? `Vendidas: ${t.sold} · Quedan: ${t.remaining}` : "Sin cupo propio"}>
                      <TextField
                        size="small" type="number" value={r.cap}
                        onChange={(e) => patch(t.key, { cap: e.target.value })}
                        placeholder="sin límite"
                        inputProps={{ min: 0, style: { textAlign: "right" } }}
                        sx={{ width: 100 }}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    {t.quantities ? (
                      <TextField
                        size="small" value={r.quantities}
                        onChange={(e) => patch(t.key, { quantities: e.target.value })}
                        placeholder="50, 100"
                        sx={{ width: 110 }}
                      />
                    ) : (
                      <TextField
                        size="small" type="number" value={r.maxQty}
                        onChange={(e) => patch(t.key, { maxQty: e.target.value })}
                        placeholder="máx. 20"
                        inputProps={{ min: 1, style: { textAlign: "right" } }}
                        sx={{ width: 110 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" type="datetime-local" value={r.salesFrom}
                      onChange={(e) => patch(t.key, { salesFrom: e.target.value })}
                      InputLabelProps={{ shrink: true }} sx={{ width: 190 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" type="datetime-local" value={r.salesTo}
                      onChange={(e) => patch(t.key, { salesTo: e.target.value })}
                      InputLabelProps={{ shrink: true }} sx={{ width: 190 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      size="small"
                      color={t.open ? "success" : "default"}
                      variant={t.open ? "filled" : "outlined"}
                      label={t.open ? "En venta" : CLOSED_LABEL[t.closedReason || ""] || "Cerrada"}
                    />
                    <Typography variant="caption" display="block" color="text.secondary">
                      {t.sold} vendidas
                      {t.price !== null ? ` · ${formatCOP(t.price)}` : ""}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Divider sx={{ my: 2.5 }} />

        <Typography variant="subtitle2" fontWeight={500} mb={0.5}>
          Fechas y pruebas
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Las fechas del evento definen los días de feria: de ahí salen el precio de apertura
          (jueves) frente al resto, el viernes del 2x1 y qué compras cuentan como preventa.
          La taquilla vende en sitio aunque la preventa esté cerrada.
        </Typography>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} mt={2}>
          <TextField
            size="small" type="date" label="Inicio de feria" value={from}
            onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small" type="date" label="Fin de feria" value={to}
            onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }}
          />
          <Button
            size="small" variant="outlined" startIcon={<CalendarClock size={14} />}
            onClick={() => saveDates.mutate()}
            disabled={!from || !to || from >= to || saveDates.isPending}
          >
            Guardar fechas del evento
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
          <Button size="small" variant="outlined" disabled={save.isPending}
            onClick={() => applyWindow(shiftDays(-1), shiftDays(30))}>
            Abrir preventa ahora
          </Button>
          <Button size="small" variant="outlined" disabled={save.isPending}
            onClick={() => applyWindow(shiftDays(1), shiftDays(30))}>
            Programar para mañana
          </Button>
          <Button size="small" variant="outlined" color="warning" disabled={save.isPending}
            onClick={() => applyWindow(shiftDays(-30), shiftDays(0, -1))}>
            Cerrar preventa
          </Button>
          <Button size="small" variant="outlined" disabled={save.isPending}
            onClick={() => applyWindow("", "")}>
            Sin límite de fechas
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
