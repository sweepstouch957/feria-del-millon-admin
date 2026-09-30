"use client";

import { Box, Chip, Stack, Typography } from "@mui/material";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { DaysGrid } from "@components/admin/tickets/DaysGrid";
import PresaleCard from "@components/admin/tickets/PresaleCard";
import { TicketsTable } from "@/components/admin/tickets/TicketsTable";
import { eyebrow } from "@/app/theme";

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";

export default function TicketsAdminPage() {
  const { event, eventId, isLoading, isError, refetch } = useActiveEvent();

  if (!eventId) {
    return <ActiveEventGate isLoading={isLoading} isError={isError} onRetry={refetch} />;
  }

  return (
    <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      <Stack gap={0.75} sx={{ mb: { xs: 2.5, md: 3.5 } }}>
        <Typography sx={{ ...eyebrow, color: "text.secondary" }}>Boletería</Typography>
        <Typography variant="h3" component="h1">Gestión de boletos</Typography>
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          <Typography variant="body2" color="text.secondary">
            {event?.name} · {fmt(event?.validFrom)} – {fmt(event?.validTo)}
          </Typography>
          {event?.status === "active" && <Chip size="small" color="success" label="Feria activa" />}
        </Stack>
      </Stack>

      <Stack gap={{ xs: 2, md: 3 }}>
        {/* Preventa: tipos de entrada, precios, cupos y ventana de venta */}
        <PresaleCard eventId={eventId} />
        {/* Días del evento + capacidad */}
        <DaysGrid eventId={eventId} />
        {/* Boletos emitidos */}
        <TicketsTable eventId={eventId} />
      </Stack>
    </Box>
  );
}
