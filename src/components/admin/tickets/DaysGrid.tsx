"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Edit as EditIcon } from "@mui/icons-material";
import { RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatCOP } from "@/utils/money";
import { eyebrow } from "@/app/theme";
import { getTicketDays, updateTicketDay, type TicketDaySummary } from "@services/ticket.service";

/* Días de la feria: precio, capacidad y ocupación de cada uno. El interruptor
   activa o apaga el día al instante; el lápiz abre la edición de precio y cupo. */

type Edit = { day: TicketDaySummary; cap: string; price: string; isActive: boolean } | null;

const KIND: Record<string, { label: string; color: "default" | "secondary" | "warning" | "error" }> = {
  opening: { label: "Apertura", color: "secondary" },
  penultimate: { label: "Penúltimo día", color: "warning" },
  last: { label: "Último día", color: "error" },
};

/** Color de la barra por ocupación: verde, ámbar desde 70 %, rojo desde 90 %. */
const loadColor = (p: number): "success" | "warning" | "error" => (p >= 90 ? "error" : p >= 70 ? "warning" : "success");

export function DaysGrid({ eventId }: { eventId: string }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["ticketDays", eventId],
    queryFn: () => getTicketDays(eventId),
    enabled: !!eventId,
  });
  const [edit, setEdit] = useState<Edit>(null);

  const update = useMutation({
    mutationFn: (p: { id: string; cap: number; price: number; isActive: boolean }) =>
      updateTicketDay(p.id, { cap: p.cap, price: p.price, isActive: p.isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticketDays", eventId] });
      setEdit(null);
    },
  });

  const days = data?.days ?? [];
  const totalCap = days.reduce((a, d) => a + (d.cap || 0), 0);
  const totalUsed = days.reduce((a, d) => a + d.sold + d.checked_in, 0);
  const totalPct = totalCap > 0 ? Math.round((totalUsed / totalCap) * 100) : 0;

  const toggle = (day: TicketDaySummary) =>
    update.mutate({ id: day.id, cap: day.cap, price: day.price, isActive: !day.isActive });

  return (
    <>
      <Card>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "flex-start" }}
          gap={2}
          sx={{ p: { xs: 2, md: 3 }, pb: 2 }}
        >
          <Box>
            <Typography sx={{ ...eyebrow, color: "primary.main" }}>Capacidad</Typography>
            <Typography variant="h5" sx={{ mt: 0.5 }}>Días de la feria</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Precio, cupo y estado de cada día.
            </Typography>
          </Box>
          <Stack direction="row" alignItems="center" gap={2}>
            {totalCap > 0 && (
              <Box sx={{ minWidth: 180, flex: { xs: 1, sm: "none" } }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Ocupación total</Typography>
                  <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>{totalPct}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={Math.min(100, totalPct)} color={loadColor(totalPct)} sx={{ height: 6, mt: 0.5 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {totalUsed.toLocaleString("es-CO")} de {totalCap.toLocaleString("es-CO")}
                </Typography>
              </Box>
            )}
            <Tooltip title="Recargar">
              <span>
                <IconButton onClick={() => refetch()} disabled={isFetching} sx={{ border: 1, borderColor: "divider" }}>
                  {isFetching ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        <Box sx={{ px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 } }}>
          {isError && <Alert severity="error" action={<Button onClick={() => refetch()}>Reintentar</Button>}>No se pudieron cargar los días.</Alert>}
          {update.isError && <Alert severity="error" sx={{ mb: 2 }}>No se pudo guardar el día. Intenta de nuevo.</Alert>}

          <Grid container spacing={2}>
            {isLoading &&
              [0, 1, 2, 3].map((i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, lg: 3 }}><Skeleton variant="rectangular" height={176} /></Grid>
              ))}

            {!isLoading && !isError && days.length === 0 && (
              <Grid size={12}>
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                  No hay días configurados. Se crean al guardar las fechas de la feria.
                </Typography>
              </Grid>
            )}

            {days.map((day) => {
              const used = day.sold + day.checked_in;
              const pct = day.cap > 0 ? Math.round((used / day.cap) * 100) : 0;
              const kind = KIND[day.kind] ?? { label: "Día regular", color: "default" as const };
              return (
                <Grid key={day.id} size={{ xs: 12, sm: 6, lg: 3 }}>
                  <Box
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      p: 2,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.25,
                      opacity: day.isActive ? 1 : 0.55,
                      transition: "opacity .15s",
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                      <Typography variant="h6" sx={{ textTransform: "capitalize" }}>{day.display}</Typography>
                      <Chip size="small" label={kind.label} color={kind.color} variant={kind.color === "default" ? "outlined" : "filled"} />
                    </Stack>

                    <Typography sx={{ fontSize: 24, fontVariantNumeric: "tabular-nums" }}>{formatCOP(day.price)}</Typography>

                    <Box>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                          {used.toLocaleString("es-CO")} / {day.cap.toLocaleString("es-CO")}
                        </Typography>
                        <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>{pct}%</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={Math.min(100, pct)} color={loadColor(pct)} sx={{ height: 6, mt: 0.5 }} />
                      <Typography variant="caption" color="text.secondary">
                        {day.sold} vendidos · {day.checked_in} ingresaron
                      </Typography>
                    </Box>

                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: "auto", pt: 0.5 }}>
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <Switch
                          size="small"
                          checked={day.isActive}
                          disabled={update.isPending}
                          onChange={() => toggle(day)}
                          inputProps={{ "aria-label": `${day.isActive ? "Desactivar" : "Activar"} ${day.display}` }}
                        />
                        <Typography variant="caption">{day.isActive ? "Activo" : "Inactivo"}</Typography>
                      </Stack>
                      <Button
                        size="small"
                        startIcon={<EditIcon fontSize="small" />}
                        onClick={() => setEdit({ day, cap: String(day.cap ?? ""), price: String(day.price ?? ""), isActive: day.isActive })}
                      >
                        Editar
                      </Button>
                    </Stack>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Card>

      <Dialog open={!!edit} onClose={() => setEdit(null)} maxWidth="xs" fullWidth fullScreen={fullScreen}>
        <DialogTitle>Editar día</DialogTitle>
        <DialogContent dividers>
          {edit && (
            <Stack spacing={2.5} sx={{ mt: 0.5 }}>
              <Typography variant="h6" sx={{ textTransform: "capitalize" }}>{edit.day.display}</Typography>
              <TextField
                label="Precio"
                value={edit.price}
                onChange={(e) => setEdit({ ...edit, price: e.target.value.replace(/\D/g, "") })}
                slotProps={{
                  htmlInput: { inputMode: "numeric" },
                  input: { startAdornment: <InputAdornment position="start">$</InputAdornment>, endAdornment: <InputAdornment position="end">COP</InputAdornment> },
                }}
                helperText={edit.price ? formatCOP(Number(edit.price)) : " "}
              />
              <TextField
                label="Capacidad"
                value={edit.cap}
                onChange={(e) => setEdit({ ...edit, cap: e.target.value.replace(/\D/g, "") })}
                slotProps={{ htmlInput: { inputMode: "numeric" }, input: { endAdornment: <InputAdornment position="end">boletos</InputAdornment> } }}
                helperText={`Ya usados: ${(edit.day.sold + edit.day.checked_in).toLocaleString("es-CO")}`}
              />
              <Stack direction="row" alignItems="center" gap={1}>
                <Switch checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} />
                <Typography variant="body2">{edit.isActive ? "Día activo" : "Día inactivo"}</Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEdit(null)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={update.isPending || !edit}
            startIcon={update.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
            onClick={() =>
              edit && update.mutate({ id: edit.day.id, cap: Number(edit.cap || 0), price: Number(edit.price || 0), isActive: edit.isActive })
            }
          >
            Guardar cambios
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
