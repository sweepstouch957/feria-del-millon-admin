"use client";

import { useState } from "react";
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
} from "@mui/material";
import {
  Edit as EditIcon,
  Refresh as RefreshIcon,
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
  cap: string;   // lo guardamos como string para controlar mejor el input
  price: string; // igual
  isActive: boolean;
};

export function DaysGrid({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ticketDays", eventId],
    queryFn: () => getTicketDays(eventId),
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
      queryClient.invalidateQueries({ queryKey: ["ticketDays", eventId] });
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
    // solo dejamos dígitos
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
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <CardHeader
          title="Días del evento"
          subheader="Configura capacidad, precio y estado de cada día."
          action={
            <IconButton onClick={() => refetch()} size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
          }
        />
        <CardContent>
          {isLoading && <Typography>Cargando días…</Typography>}
          {isError && (
            <Alert severity="error">
              No se pudieron cargar los días de tickets. Revisa la configuración
              del evento.
            </Alert>
          )}

          {!isLoading && !isError && days.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No hay días configurados para este evento.
            </Typography>
          )}

          <Grid container spacing={2}>
            {days.map((day) => {
              const used = day.sold + day.checked_in;
              const percent = day.cap > 0 ? Math.round((used / day.cap) * 100) : 0;

              return (
                <Grid size={{
                    xs: 12,
                    sm: 6,
                    md: 6
                }} key={day.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      borderColor: day.isToday ? "primary.main" : "divider",
                      boxShadow: day.isToday ? 3 : 0,
                    }}
                  >
                    <CardContent sx={{ pb: 1.5 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                        mb={1}
                      >
                        <Typography fontWeight={700} fontSize={15}>
                          {day.display}
                        </Typography>
                        <Chip
                          size="small"
                          label={kindLabel(day.kind)}
                          color={kindColor(day.kind)}
                          variant="filled"
                        />
                      </Stack>

                      <Typography
                        variant="h6"
                        fontWeight={800}
                        sx={{ mb: 0.5 }}
                      >
                        {Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: "COP",
                          maximumFractionDigits: 0,
                        }).format(day.price)}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mb: 1 }}
                      >
                        por boleto · Capacidad: {day.cap.toLocaleString("es-CO")}
                      </Typography>

                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={0.5}
                      >
                        <Typography variant="caption" color="text.secondary">
                          Vendidos / check-in: {used.toLocaleString("es-CO")} /{" "}
                          {day.cap.toLocaleString("es-CO")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {percent}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={percent}
                        sx={{
                          borderRadius: 10,
                          height: 8,
                          mb: 1.2,
                        }}
                      />

                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={1}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            Activo
                          </Typography>
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

      {/* Diálogo de edición */}
      <Dialog open={editState.open} onClose={handleCloseEdit} maxWidth="xs" fullWidth>
        <DialogTitle>Editar día del evento</DialogTitle>
        <DialogContent dividers>
          {editState.day && (
            <Stack spacing={2} mt={0.5}>
              <Typography variant="body2" fontWeight={600}>
                {editState.day.display}
              </Typography>

              <TextField
                label="Capacidad (boletos)"
                fullWidth
                value={editState.cap}
                inputProps={{ inputMode: "numeric" }}
                onChange={(e) => handleCapChange(e.target.value)}
              />
              <TextField
                label="Precio por boleto (COP)"
                fullWidth
                value={editState.price}
                inputProps={{ inputMode: "numeric" }}
                onChange={(e) => handlePriceChange(e.target.value)}
              />
              <Stack direction="row" alignItems="center" spacing={1}>
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
