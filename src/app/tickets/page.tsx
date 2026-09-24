"use client";

import { Box, Typography } from "@mui/material";
import { DEFAULT_EVENT_ID, DEFAULT_EVENT_NAME } from "@core/constants";
import { DaysGrid } from "@components/admin/tickets/DaysGrid";
import PresaleCard from "@components/admin/tickets/PresaleCard";
import { TicketsTable } from "@/components/admin/tickets/TicketsTable";

export default function TicketsAdminPage() {
  const eventId = DEFAULT_EVENT_ID;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      <Typography variant="h4" fontWeight={500} mb={0.5}>
        Gestión de boletos
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {DEFAULT_EVENT_NAME} · Control de días, capacidad y compras.
      </Typography>

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
