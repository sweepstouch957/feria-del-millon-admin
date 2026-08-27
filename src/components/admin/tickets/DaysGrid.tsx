"use client";

import { useState } from "react";
import { formatCOP } from "@/utils/money";
import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Switch,
  TextField,
  Typography,
  Button,
  MenuItem,
} from "@mui/material";
import {
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  getTicketDays,
  updateTicketDay,
  type TicketDaySummary,
} from "@services/ticket.service";

type EditDayState = {
  open: boolean;
  day: TicketDaySummary | null;
  cap: string;
  price: string;
  isActive: boolean;
};

export function DaysGrid({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();

  /** FUTURO: selección de evento */
  const [selectedEvent, setSelectedEvent] = useState(eventId);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ticketDays", selectedEvent],
    queryFn: () => getTicketDays(selectedEvent),
  });

  const [editState, setEditState] = useState<EditDayState>({
    open: false,
    day: null,
    cap: "",
    price: "",
    isActive: true,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      cap: number;
      price: number;
      isActive: boolean;
    }) =>
      updateTicketDay(payload.id, {
        cap: payload.cap,
        price: payload.price,
        isActive: payload.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticketDays", selectedEvent] });
      setEditState((prev) => ({ ...prev, open: false }));
    },
  });

  const days = data?.days ?? [];

  const handleOpenEdit = (day: TicketDaySummary) => {
    setEditState({
      open: true,
      day,
      cap: String(day.cap ?? ""),
      price: String(day.price ?? ""),
      isActive: day.isActive,
    });
  };

  const handleCloseEdit = () => {
    setEditState((prev) => ({ ...prev, open: false }));
  };

  const handleCapChange = (value: string) => {
    const numeric = value.replace(/\D/g, "");
    setEditState((prev) => ({ ...prev, cap: numeric }));
  };

  const handlePriceChange = (value: string) => {
    const numeric = value.replace(/\D/g, "");
    setEditState((prev) => ({ ...prev, price: numeric }));
  };

  const handleSaveEdit = () => {
    if (!editState.day) return;

    const capNumber = Number(editState.cap || 0);
    const priceNumber = Number(editState.price || 0);

    updateMutation.mutate({
      id: editState.day.id,
      cap: capNumber,
      price: priceNumber,
      isActive: editState.isActive,
    });
  };

  const kindColor = (kind: string) => {
    switch (kind) {
      case "opening":
        return "secondary";
      case "penultimate":
        return "warning";
      case "last":
        return "error";
      default:
        return "default";
    }
  };

  const kindLabel = (kind: string) => {
    switch (kind) {
      case "opening":
        return "Apertura";
      case "penultimate":
        return "Penúltimo día";
      case "last":
        return "Último día";
      default:
        return "Día regular";
    }
  };

  return (
    <>
      <Card
        sx={{
          borderRadius: 0,
          border: "1px solid",
          borderColor: "divider",
          mb: 3,
        }}
      >
        <CardHeader
          title="Días del evento"
          subheader="Configura capacidad, precio y estado por día."
          action={
            <Stack direction="row" flexWrap="wrap" spacing={1}>
              {/* Botón “Agregar día” deshabilitado (futuro feature) */}
              <Button
                size="small"
                startIcon={<AddIcon />}
                disabled
                sx={{ textTransform: "none", opacity: 0.5 }}
                title="Próximamente"
              >
                Nuevo día
              </Button>

              <IconButton onClick={() => refetch()} size="small">
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Stack>
          }
        />
        <CardContent>
          {/* Selector de Evento (para futuro multi-evento) */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
            <TextField
              select
              label="Evento"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              sx={{ width: { xs: "100%", sm: "50%" } }}
            >
              <MenuItem value={eventId}>Feria del Millón 2025</MenuItem>
              {/* Aquí en el futuro se agregan más eventos */}
            </TextField>
          </Stack>

          {isLoading && <Typography>Cargando días…</Typography>}
          {isError && (
            <Alert severity="error">
              No se pudieron cargar los días de tickets.
            </Alert>
          )}

          {!isLoading && !isError && days.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No hay días configurados.
            </Typography>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            {days.map((day) => {
              const used = day.sold + day.checked_in;
              const percent =
                day.cap > 0 ? Math.round((used / day.cap) * 100) : 0;

              return (
                <Grid
                  key={day.id}
                  size={{
                    xs: 12,
                    sm: 6,
                    md: 4,
                  }}
                >
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 0,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      borderColor:  "divider",
                      boxShadow: 0,
                    }}
                  >
                    <CardContent sx={{ pb: 1.5 }}>
                      <Stack
                        direction="row" flexWrap="wrap"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={1}
                      >
                        <Typography fontWeight={500} fontSize={15}>
                          {day.display}
                        </Typography>
                        <Chip
                          size="small"
                          label={kindLabel(day.kind)}
                          color={kindColor(day.kind)}
                        />
                      </Stack>

                      <Typography variant="h6" fontWeight={500} sx={{ mb: 0.5 }}>
                        {formatCOP(day.price)}
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        Capacidad: {day.cap.toLocaleString("es-CO")}
                      </Typography>

                      <Stack
                        direction="row" flexWrap="wrap"
                        justifyContent="space-between"
                        mt={1}
                      >
                        <Typography variant="caption">
                          Vendidos/check-in: {used}
                        </Typography>
                        <Typography variant="caption">{percent}%</Typography>
                      </Stack>

                      <LinearProgress
                        variant="determinate"
                        value={percent}
                        sx={{ borderRadius: 0, height: 8, mt: 0.4 }}
                      />

                      <Stack
                        direction="row" flexWrap="wrap"
                        justifyContent="space-between"
                        alignItems="center"
                        mt={1.2}
                      >
                        <Stack direction="row" flexWrap="wrap" spacing={1} alignItems="center">
                          <Typography variant="caption">Activo</Typography>
                          <Switch
                            size="small"
                            checked={day.isActive}
                            onChange={() =>
                              handleOpenEdit({
                                ...day,
                                isActive: !day.isActive,
                              })
                            }
                          />
                        </Stack>

                        <IconButton
                          size="small"
                          onClick={() => handleOpenEdit(day)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* EDIT DIALOG */}
      <Dialog open={editState.open} onClose={handleCloseEdit} maxWidth="xs" fullWidth>
        <DialogTitle>Editar día del evento</DialogTitle>
        <DialogContent dividers>
          {editState.day && (
            <Stack spacing={2} mt={0.5}>
              <Typography variant="body2" fontWeight={500}>
                {editState.day.display}
              </Typography>

              <TextField
                label="Capacidad (boletos)"
                value={editState.cap}
                inputProps={{ inputMode: "numeric" }}
                onChange={(e) => handleCapChange(e.target.value)}
              />

              <TextField
                label="Precio (COP)"
                value={editState.price}
                inputProps={{ inputMode: "numeric" }}
                onChange={(e) => handlePriceChange(e.target.value)}
              />

              <Stack direction="row" flexWrap="wrap" alignItems="center" spacing={1}>
                <Switch
                  checked={editState.isActive}
                  onChange={(e) =>
                    setEditState((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                />
                <Typography variant="body2">
                  {editState.isActive ? "Día activo" : "Día inactivo"}
                </Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseEdit}>Cancelar</Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={updateMutation.isPending}
          >
            Guardar cambios
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
