"use client";

import { Box, Card, Typography } from "@mui/material";
import PageHeader from "@/components/ui/PageHeader";

/* Ventas de las obras del artista. Todavía sin datos: el reporte por artista
   existe en el panel de la feria, no en esta vista. */

export default function OrdersPlaceholder() {
  return (
    <Box>
      <PageHeader
        crumb="Artista"
        title="Mis pedidos"
        description="Las ventas de tus obras en la feria."
      />
      <Card sx={{ p: 5, textAlign: "center" }}>
        <Box sx={{ maxWidth: 520, mx: "auto" }}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            Aquí aparecerán las ventas de tus obras con su estado y su comprobante.
            Mientras tanto, la feria te informa cada venta por correo.
          </Typography>
        </Box>
      </Card>
    </Box>
  );
}
