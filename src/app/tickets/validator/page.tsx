"use client";

import { Box } from "@mui/material";
import { QrValidationPanel } from "@/components/admin/tickets/QrValidationPanel";
import { CheckinsPanel } from "@/components/admin/tickets/CheckinsPanel";
import PageHeader from "@/components/ui/PageHeader";

export default function QrValidatorPage() {
  return (
    <Box sx={{ maxWidth: 820, mx: "auto" }}>
      <PageHeader
        crumb="Boletos"
        title="Validador QR"
        description="Escanea la boleta en la entrada del pabellón para permitir o rechazar el acceso."
      />
      <QrValidationPanel />
      <CheckinsPanel />
    </Box>
  );
}
