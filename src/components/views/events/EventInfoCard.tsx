"use client";

import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Typography,
  Stack,
  TextField,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Chip,
} from "@mui/material";
import {
  DatePicker,
} from "@mui/x-date-pickers";
import type { Dayjs } from "dayjs";

import type { EventDoc } from "@services/events.service";
import type { EventFormState } from "@hooks/events/useEventsManager";

type Props = {
  events: EventDoc[];
  loadingEvents: boolean;
  selectedEvent: EventDoc | null;
  selectedEventId: string | null;
  eventForm: EventFormState | null;
  onSelectEvent: (id: string) => void;
  onFieldChange: (
    field: keyof EventFormState,
    value: string | number | Dayjs | null
  ) => void;
  onToggleStatus: (checked: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
};

export default function EventInfoCard({
  events,
  loadingEvents,
  selectedEvent,
  selectedEventId,
  eventForm,
  onSelectEvent,
  onFieldChange,
  onToggleStatus,
  onSave,
  isSaving,
}: Props) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
      <CardHeader
        title="Evento"
        subheader="Información general del evento"
        sx={{ pb: 1 }}
      />
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          select
          label="Selecciona evento"
          size="small"
          value={selectedEventId ?? ""}
          onChange={(e) => onSelectEvent(e.target.value)}
          fullWidth
          disabled={loadingEvents || !events || events.length === 0}
        >
          {events && events.length > 0 ? (
            events.map((ev) => (
              <MenuItem key={ev.id} value={ev.id}>
                {ev.name}
                {ev.status === "active" && (
                  <Chip
                    color="success"
                    size="small"
                    label="Activo"
                    sx={{ ml: 1 }}
                  />
                )}
              </MenuItem>
            ))
          ) : (
            <MenuItem value="" disabled>
              No hay eventos disponibles
            </MenuItem>
          )}
        </TextField>

        {selectedEvent && eventForm && (
          <>
            <Divider sx={{ my: 1 }} />

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                label={eventForm.status.toUpperCase()}
                color={
                  eventForm.status === "active"
                    ? "success"
                    : eventForm.status === "draft"
                    ? "default"
                    : "warning"
                }
              />
              <FormControlLabel
                sx={{ ml: "auto" }}
                control={
                  <Switch
                    checked={eventForm.status === "active"}
                    onChange={(e) => onToggleStatus(e.target.checked)}
                  />
                }
                label={
                  eventForm.status === "active"
                    ? "Evento activo"
                    : "Evento desactivado"
                }
              />
            </Stack>

            <TextField
              label="Nombre"
              size="small"
              value={eventForm.name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              fullWidth
            />
            <TextField
              label="Slug"
              size="small"
              value={eventForm.slug}
              onChange={(e) => onFieldChange("slug", e.target.value)}
              fullWidth
            />
            <TextField
              label="Descripción"
              size="small"
              value={eventForm.description ?? ""}
              onChange={(e) =>
                onFieldChange("description", e.target.value)
              }
              fullWidth
              multiline
              minRows={3}
            />

            <Stack direction="row" spacing={2}>
              <DatePicker
                label="Válido desde"
                value={eventForm.validFrom}
                onChange={(value) => onFieldChange("validFrom", value)}
                slotProps={{
                  textField: { size: "small", fullWidth: true },
                }}
              />
              <DatePicker
                label="Válido hasta"
                value={eventForm.validTo}
                onChange={(value) => onFieldChange("validTo", value)}
                slotProps={{
                  textField: { size: "small", fullWidth: true },
                }}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Min. precio obra"
                size="small"
                type="number"
                value={eventForm.minArtworkPrice ?? ""}
                onChange={(e) =>
                  onFieldChange(
                    "minArtworkPrice",
                    Number(e.target.value) || 0
                  )
                }
                fullWidth
              />
              <TextField
                label="Máx. precio obra"
                size="small"
                type="number"
                value={eventForm.maxArtworkPrice ?? ""}
                onChange={(e) =>
                  onFieldChange(
                    "maxArtworkPrice",
                    Number(e.target.value) || 0
                  )
                }
                fullWidth
              />
            </Stack>

            <TextField
              label="Moneda"
              size="small"
              value={eventForm.currency ?? "COP"}
              onChange={(e) => onFieldChange("currency", e.target.value)}
              fullWidth
            />
          </>
        )}

        {!selectedEvent && !loadingEvents && (
          <Typography variant="body2" color="text.secondary">
            No hay eventos para mostrar.
          </Typography>
        )}
      </CardContent>
      {selectedEvent && (
        <CardActions sx={{ justifyContent: "flex-end", px: 3, pb: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </CardActions>
      )}
    </Card>
  );
}
