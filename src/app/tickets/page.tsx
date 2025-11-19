"use client";

import { Box, Grid, Typography } from "@mui/material";
import { DEFAULT_EVENT_ID, DEFAULT_EVENT_NAME } from "@core/constants";
import { DaysGrid } from "@components/admin/tickets/DaysGrid";
import { TicketsTable } from "@/components/admin/tickets/TicketsTable";
import { QrValidationPanel } from "@/components/admin/tickets/QrValidationPanel";

export default function TicketsAdminPage() {
  const eventId = DEFAULT_EVENT_ID;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      <Typography variant="h4" fontWeight={700} mb={0.5}>
        Gestión de boletos
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {DEFAULT_EVENT_NAME} · Control de días, capacidad, compras y acceso por QR.
      </Typography>

      <Grid container spacing={3}>
        {/* Izquierda: días + tickets */}
        <Grid 
        size={{
            xs: 12,
            md: 7,
            lg: 8
        }}
        >
          <DaysGrid eventId={eventId} />

          <Box mt={3}>
            <TicketsTable eventId={eventId} />
          </Box>
        </Grid>

        {/* Derecha: panel QR */}
        <Grid size={{
            xs: 12,
            md: 5,
            lg: 4
        }}>
          <QrValidationPanel />
        </Grid>
      </Grid>
    </Box>
  );
}
