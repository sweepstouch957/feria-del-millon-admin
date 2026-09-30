"use client";

import * as React from "react";
import {
  Alert, Box, Button, Card, Chip, CircularProgress, Grid, IconButton, InputAdornment,
  Skeleton, Stack, Switch, TextField, Tooltip, Typography, alpha, useTheme,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CalendarOff, CalendarPlus, Infinity as InfinityIcon, PlayCircle, RefreshCw, Save } from "lucide-react";
import { formatCOP } from "@/utils/money";
import { eyebrow } from "@/app/theme";
import { updateEvent } from "@services/events.service";
import { DateField, DateTimeField } from "@/components/common/DateFields";
import {
  getTicketTypes, saveTicketTypes,
  type SaveTicketTypeInput, type TicketTypeConfig, type TicketTypeKey,
} from "@services/ticket.service";

/* Preventa de entradas: qué se vende, a qué precio, con qué cupo y entre qué
   fechas. Todo editable para no depender de un despliegue — y para poder probar
   moviendo las fechas (atajos de abajo) sin tocar la base a mano.

   Cada tipo es un panel: arriba qué es y cómo va; abajo sus campos en una
   rejilla que en el teléfono queda en una sola columna. */

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

/** ISO → "YYYY-MM-DDTHH:mm" en hora local (formato de DateTimeField). */
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
const digitsOnly = (v: string) => v.replace(/[^\d]/g, "");
const sameRow = (a?: Row, b?: Row) => !!a && !!b && (Object.keys(a) as (keyof Row)[]).every((k) => a[k] === b[k]);

const CLOSED_LABEL: Record<string, string> = {
  disabled: "Apagado",
  not_started: "Aún no abre",
  ended: "Cerrada",
  sold_out: "Agotado",
};

const fmtWhen = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

/** Cifra del resumen de arriba. */
function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Box sx={{ p: 2, border: 1, borderColor: "divider", minWidth: 0 }}>
      <Typography sx={{ ...eyebrow, fontSize: 9.5, color: "text.secondary" }}>{label}</Typography>
      <Typography sx={{ fontSize: 26, fontWeight: 400, lineHeight: 1.2, mt: 0.5, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
      {hint && <Typography variant="caption" color="text.secondary" noWrap display="block">{hint}</Typography>}
    </Box>
  );
}

export default function PresaleCard({ eventId }: { eventId: string }) {
  const theme = useTheme();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["ticketTypes", eventId],
    queryFn: () => getTicketTypes(eventId),
    enabled: !!eventId,
  });

  const initial = React.useMemo(
    () => Object.fromEntries((data?.types || []).map((t) => [t.key, rowFromConfig(t)])) as Record<string, Row>,
    [data],
  );
  const [rows, setRows] = React.useState<Record<string, Row>>({});
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [msg, setMsg] = React.useState<{ kind: "success" | "error"; text: string } | null>(null);

  // La respuesta del servidor es la fuente de verdad: al recargar se reescriben los campos.
  React.useEffect(() => {
    if (!data) return;
    setRows(initial);
    setFrom(String(data.validFrom || "").slice(0, 10));
    setTo(String(data.validTo || "").slice(0, 10));
  }, [data, initial]);

  const patch = (key: string, p: Partial<Row>) =>
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], ...p } }));

  const changed = Object.keys(rows).filter((k) => !sameRow(rows[k], initial[k]));

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
      setMsg({ kind: "success", text: "Fechas de la feria actualizadas." });
      qc.invalidateQueries({ queryKey: ["ticketTypes", eventId] });
      qc.invalidateQueries({ queryKey: ["ticketDays"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (e: any) =>
      setMsg({ kind: "error", text: e?.response?.data?.error || "No se pudieron guardar las fechas." }),
  });

  /** Atajos: mueven la ventana de TODOS los tipos y guardan de una. */
  const applyWindow = (salesFrom: string, salesTo: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    const next = Object.fromEntries(
      Object.entries(rows).map(([k, r]) => [k, { ...r, salesFrom, salesTo }]),
    );
    setRows(next);
    save.mutate(next);
  };

  if (isLoading) {
    return (
      <Card sx={{ p: { xs: 2, md: 3 } }}>
        <Skeleton width={220} height={32} />
        <Skeleton width="60%" />
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {[0, 1, 2].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 4 }}><Skeleton variant="rectangular" height={88} /></Grid>
          ))}
        </Grid>
        {[0, 1].map((i) => <Skeleton key={i} variant="rectangular" height={150} sx={{ mt: 2 }} />)}
      </Card>
    );
  }
  if (isError || !data) {
    return (
      <Card sx={{ p: 2 }}>
        <Alert severity="error" action={<Button onClick={() => refetch()}>Reintentar</Button>}>
          No se pudo cargar la preventa.
        </Alert>
      </Card>
    );
  }

  const openTypes = data.types.filter((t) => t.open);
  const sold = data.types.reduce((a, t) => a + (t.sold || 0), 0);
  const closesFirst = openTypes
    .map((t) => t.salesTo)
    .filter(Boolean)
    .sort()[0] as string | undefined;

  return (
    <Card>
      {/* Cabecera: qué es y las acciones (Guardar sólo se activa con cambios) */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        justifyContent="space-between"
        gap={2}
        sx={{ p: { xs: 2, md: 3 }, pb: { xs: 2, md: 2 } }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ ...eyebrow, color: "primary.main" }}>Preventa</Typography>
          <Typography variant="h5" sx={{ mt: 0.5 }}>Tipos de entrada</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>
            Precio, cupo y ventana de venta de cada tipo. Un campo vacío usa el valor por defecto
            (en las de un día, el precio del día).
          </Typography>
        </Box>
        <Stack direction="row" gap={1} alignItems="center" sx={{ flexShrink: 0 }}>
          <Tooltip title="Recargar del servidor">
            <span>
              <IconButton onClick={() => refetch()} disabled={isFetching} sx={{ border: 1, borderColor: "divider" }}>
                {isFetching ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={save.isPending ? <CircularProgress size={14} color="inherit" /> : <Save size={16} />}
            onClick={() => save.mutate(rows)}
            disabled={save.isPending || changed.length === 0}
            sx={{ flex: { xs: 1, sm: "none" } }}
          >
            {changed.length ? `Guardar cambios (${changed.length})` : "Sin cambios"}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 } }}>
        {msg && <Alert severity={msg.kind} onClose={() => setMsg(null)} sx={{ mb: 2 }}>{msg.text}</Alert>}

        <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Stat label="En venta" value={`${openTypes.length} / ${data.types.length}`} hint="tipos abiertos ahora" />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <Stat label="Vendidas" value={sold.toLocaleString("es-CO")} hint="en preventa" />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <Stat label="Cierra primero" value={closesFirst ? fmtWhen(closesFirst) : "—"} hint={closesFirst ? "próximo cierre" : "sin fecha de cierre"} />
          </Grid>
        </Grid>

        <Stack gap={1.5}>
          {data.types.map((t) => {
            const r = rows[t.key];
            if (!r) return null;
            const dirty = changed.includes(t.key);
            const status = t.open ? "En venta" : CLOSED_LABEL[t.closedReason || ""] || "Cerrada";
            return (
              <Box
                key={t.key}
                sx={{
                  border: 1,
                  borderColor: dirty ? "primary.main" : "divider",
                  borderLeftWidth: 3,
                  borderLeftColor: dirty ? "primary.main" : t.open ? alpha(theme.palette.primary.main, 0.5) : "divider",
                  bgcolor: r.enabled ? "transparent" : alpha(theme.palette.text.primary, 0.02),
                  transition: "border-color .15s",
                }}
              >
                {/* Qué es y cómo va */}
                <Stack
                  direction="row"
                  alignItems="flex-start"
                  gap={1.5}
                  sx={{ p: 2, pb: 1.5, borderBottom: 1, borderColor: "divider" }}
                >
                  <Switch
                    checked={r.enabled}
                    onChange={(e) => patch(t.key, { enabled: e.target.checked })}
                    inputProps={{ "aria-label": `Activar ${t.label}` }}
                    sx={{ mt: -0.5, ml: -1 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography variant="h6" sx={{ opacity: r.enabled ? 1 : 0.55 }}>{t.label}</Typography>
                      {dirty && <Chip size="small" label="Sin guardar" color="primary" variant="outlined" />}
                    </Stack>
                    {t.desc && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{t.desc}</Typography>
                    )}
                    {t.requiresStudentId && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Pide foto del carné al comprar en línea.
                      </Typography>
                    )}
                  </Box>
                  <Stack alignItems="flex-end" gap={0.5} sx={{ flexShrink: 0 }}>
                    <Chip
                      size="small"
                      color={t.open ? "success" : "default"}
                      variant={t.open ? "filled" : "outlined"}
                      label={status}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                      {t.sold} vendidas{t.price !== null ? ` · ${formatCOP(t.price)}` : ""}
                    </Typography>
                  </Stack>
                </Stack>

                {/* Campos */}
                <Grid container spacing={2} sx={{ p: 2 }}>
                  <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
                    <TextField
                      label="Precio" size="small" fullWidth value={r.price}
                      onChange={(e) => patch(t.key, { price: digitsOnly(e.target.value) })}
                      placeholder={t.pickDay ? "Precio del día" : "—"}
                      helperText={t.pickDay && !r.price ? "Vacío = precio del día" : " "}
                      slotProps={{
                        htmlInput: { inputMode: "numeric" },
                        input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                        inputLabel: { shrink: true },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3, lg: 2 }}>
                    <TextField
                      label="Cupo" size="small" fullWidth value={r.cap}
                      onChange={(e) => patch(t.key, { cap: digitsOnly(e.target.value) })}
                      placeholder="Sin límite"
                      helperText={t.cap ? `Quedan ${t.remaining}` : "Sin cupo propio"}
                      slotProps={{
                        htmlInput: { inputMode: "numeric" },
                        input: { endAdornment: !r.cap ? <InputAdornment position="end"><InfinityIcon size={16} /></InputAdornment> : undefined },
                        inputLabel: { shrink: true },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3, lg: 2 }}>
                    {t.quantities ? (
                      <TextField
                        label="Cantidades" size="small" fullWidth value={r.quantities}
                        onChange={(e) => patch(t.key, { quantities: e.target.value.replace(/[^\d,\s]/g, "") })}
                        placeholder="50, 100"
                        helperText="Separadas por coma"
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    ) : (
                      <TextField
                        label="Máx. por compra" size="small" fullWidth value={r.maxQty}
                        onChange={(e) => patch(t.key, { maxQty: digitsOnly(e.target.value) })}
                        placeholder="20"
                        helperText={!r.maxQty ? "Por defecto 20" : " "}
                        slotProps={{ htmlInput: { inputMode: "numeric" }, inputLabel: { shrink: true } }}
                      />
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <DateTimeField
                      label="Abre la venta"
                      value={r.salesFrom}
                      onChange={(v) => patch(t.key, { salesFrom: v })}
                      maxDate={r.salesTo || undefined}
                      helperText={!r.salesFrom ? "Sin fecha: abierta desde ya" : " "}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <DateTimeField
                      label="Cierra la venta"
                      value={r.salesTo}
                      onChange={(v) => patch(t.key, { salesTo: v })}
                      minDate={r.salesFrom || undefined}
                      helperText={!r.salesTo ? "Sin fecha: no cierra" : " "}
                    />
                  </Grid>
                </Grid>
              </Box>
            );
          })}
        </Stack>

        {/* Fechas de la feria + atajos de la ventana de venta */}
        <Grid container spacing={2} sx={{ mt: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ border: 1, borderColor: "divider", p: 2, height: "100%" }}>
              <Stack direction="row" alignItems="center" gap={1}>
                <CalendarClock size={18} />
                <Typography variant="h6">Fechas de la feria</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                Definen los días de feria: de ahí salen el precio de apertura (jueves) frente al resto,
                el viernes del 2x1 y qué compras cuentan como preventa. La taquilla vende en sitio aunque
                la preventa esté cerrada.
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DateField label="Inicio de feria" value={from} onChange={setFrom} maxDate={to || undefined} required />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DateField label="Fin de feria" value={to} onChange={setTo} minDate={from || undefined} required />
                </Grid>
              </Grid>
              <Button
                variant="outlined" fullWidth sx={{ mt: 2 }}
                startIcon={saveDates.isPending ? <CircularProgress size={14} /> : <CalendarClock size={16} />}
                onClick={() => saveDates.mutate()}
                disabled={!from || !to || from >= to || saveDates.isPending}
              >
                Guardar fechas de la feria
              </Button>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ border: 1, borderColor: "divider", p: 2, height: "100%" }}>
              <Typography variant="h6">Atajos de la ventana de venta</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                Cambian las fechas de apertura y cierre de <b>todos</b> los tipos y guardan al instante.
              </Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Button fullWidth variant="outlined" color="success" startIcon={<PlayCircle size={16} />} disabled={save.isPending}
                    onClick={() => applyWindow(shiftDays(-1), shiftDays(30))}>
                    Abrir preventa ahora
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Button fullWidth variant="outlined" startIcon={<CalendarPlus size={16} />} disabled={save.isPending}
                    onClick={() => applyWindow(shiftDays(1), shiftDays(30))}>
                    Programar para mañana
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Button fullWidth variant="outlined" color="warning" startIcon={<CalendarOff size={16} />} disabled={save.isPending}
                    onClick={() => applyWindow(shiftDays(-30), shiftDays(0, -1), "¿Cerrar la preventa de todos los tipos ahora?")}>
                    Cerrar preventa
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Button fullWidth variant="outlined" startIcon={<InfinityIcon size={16} />} disabled={save.isPending}
                    onClick={() => applyWindow("", "", "¿Quitar las fechas de venta de todos los tipos? Quedan en venta sin límite.")}>
                    Sin límite de fechas
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Card>
  );
}
