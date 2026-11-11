"use client";

import { Box } from "@mui/material";
import { QrValidationPanel } from "@/components/admin/tickets/QrValidationPanel";
import { CheckinsPanel } from "@/components/admin/tickets/CheckinsPanel";
import PageHeader from "@/components/ui/PageHeader";

export default function QrValidatorPage() {
  return (
    <Box sx={{ maxWidth: 820, mx: "auto" }}>
      <PageHeader
        crumb="Entradas"
        title="Validar entradas"
        description="Escanea el QR en la puerta: verde entra, rojo no. Si la cámara no lee, escribe el código corto que va debajo del QR."
      />
      <QrValidationPanel />
      <CheckinsPanel />
    </Box>
  );
}
