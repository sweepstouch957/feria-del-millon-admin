"use client";

import { Box, Chip, Stack, Typography } from "@mui/material";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { DaysGrid } from "@components/admin/tickets/DaysGrid";
import PresaleCard from "@components/admin/tickets/PresaleCard";
import { TicketsTable } from "@/components/admin/tickets/TicketsTable";

const fmt = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })
    : "";

export default function TicketsAdminPage() {
  const { event, eventId, isLoading, isError, refetch } = useActiveEvent();

  if (!eventId) {
    return <ActiveEventGate isLoading={isLoading} isError={isError} onRetry={refetch} />;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      <Typography variant="h4" fontWeight={500} mb={0.5}>
        Gestión de boletos
      </Typography>
      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" mb={3}>
        <Typography variant="body2" color="text.secondary">
          {event?.name} · {fmt(event?.validFrom)} – {fmt(event?.validTo)} · Control de días,
          capacidad y compras.
        </Typography>
        {event?.status === "active" && (
          <Chip size="small" color="success" label="Feria activa" sx={{ borderRadius: 0 }} />
        )}
      </Stack>

      {/* Preventa: tipos de entrada, precios, cupos y ventana de venta */}
      <PresaleCard eventId={eventId} />

      {/* Días del evento + capacidad */}
      <Box mt={3}>
        <DaysGrid eventId={eventId} />
      </Box>

      {/* Tabla de tickets */}
      <Box mt={3}>
        <TicketsTable eventId={eventId} />
      </Box>
    </Box>
  );
}
