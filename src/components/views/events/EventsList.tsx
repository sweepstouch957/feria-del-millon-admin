"use client";

import * as React from "react";
import {
  Box,
  Button,
  Chip,
  Stack,
  Typography,
  CircularProgress,
} from "@mui/material";
import { Plus } from "lucide-react";
import type { EventDoc, EventStatus } from "@/services/events.service";
import { eyebrow, FDM } from "@/app/theme";

/* Listado de ediciones. Antes era un desplegable: había que abrirlo para
   saber qué ediciones existían y no se veía el estado de ninguna. */

const STATUS: Record<EventStatus | string, { label: string; color: string }> = {
  active: { label: "Activo", color: FDM.green },
  draft: { label: "Borrador", color: FDM.amber },
  finalizado: { label: "Finalizado", color: "#6B6862" },
  archived: { label: "Archivado", color: "#9B978E" },
};

function fmt(d?: string) {
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(d));
  } catch {
    return "";
  }
}

export default function EventsList({
  events,
  loading,
  selectedEventId,
  onSelect,
  onCreate,
  pavilionCounts,
}: {
  events: EventDoc[];
  loading?: boolean;
  selectedEventId?: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  /** id de evento -> cuántos pabellones tiene. */
  pavilionCounts?: Record<string, number>;
}) {
  // Más recientes primero: la edición en curso es la que se toca a diario.
  const sorted = React.useMemo(
    () =>
      [...(events || [])].sort(
        (a, b) =>
          new Date(b.validFrom || 0).getTime() - new Date(a.validFrom || 0).getTime()
      ),
    [events]
  );

  return (
    <Box>
      <Stack
        direction="row"
        flexWrap="wrap"
        alignItems="center"
        justifyContent="space-between"
        gap={1.5}
        mb={2}
      >
        <Typography sx={{ ...eyebrow, color: "text.secondary" }}>
          Ediciones {sorted.length > 0 && `· ${sorted.length}`}
        </Typography>
        <Button size="small" variant="outlined" startIcon={<Plus size={14} />} onClick={onCreate}>
          Nueva edición
        </Button>
      </Stack>

      {loading ? (
        <Stack alignItems="center" py={4}>
          <CircularProgress size={22} />
        </Stack>
      ) : sorted.length === 0 ? (
        <Box sx={{ py: 5, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Todavía no hay ediciones creadas.
          </Typography>
          <Button variant="contained" disableElevation startIcon={<Plus size={14} />} onClick={onCreate}>
            Crear la primera
          </Button>
        </Box>
      ) : (
        <Stack sx={{ borderTop: 1, borderColor: "divider" }}>
          {sorted.map((ev) => {
            const on = ev.id === selectedEventId;
            const st = STATUS[ev.status as string] || { label: ev.status, color: "#6B6862" };
            const count = pavilionCounts?.[ev.id];
            return (
              <Box
                key={ev.id}
                onClick={() => onSelect(ev.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(ev.id);
                  }
                }}
                sx={{
                  py: 1.75,
                  px: 1.5,
                  cursor: "pointer",
                  borderBottom: 1,
                  borderColor: "divider",
                  // El seleccionado se marca con filete a la izquierda, no con
                  // relleno: así no compite con los chips de estado.
                  borderLeft: "2px solid",
                  borderLeftColor: on ? FDM.green : "transparent",
                  bgcolor: on ? "action.hover" : "transparent",
                  transition: "background-color .2s ease",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1} mb={0.5}>
                  <Typography sx={{ fontWeight: 500, fontSize: 15, flex: 1, minWidth: 0 }}>
                    {ev.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={st.label}
                    sx={{
                      height: 20,
                      fontSize: 10,
                      color: st.color,
                      borderColor: st.color,
                      bgcolor: "transparent",
                      border: "1px solid",
                    }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {fmt(ev.validFrom)} — {fmt(ev.validTo)}
                  {typeof count === "number" &&
                    ` · ${count} ${count === 1 ? "pabellón" : "pabellones"}`}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
