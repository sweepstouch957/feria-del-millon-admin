"use client";

import { Box, Typography } from "@mui/material";
import { Lock } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";

/** Pantalla para secciones bloqueadas (ver utils/exportsLock). */
export default function LockedNotice({ title }: { title: string }) {
  return (
    <Box>
      <PageHeader title={title} />
      <Box sx={{ border: "1px solid", borderColor: "divider", p: { xs: 3, md: 5 }, textAlign: "center", maxWidth: 560 }}>
        <Lock size={28} strokeWidth={1.5} />
        <Typography variant="h6" sx={{ mt: 1.5 }}>Sección deshabilitada</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          El detalle de ventas no está disponible por ahora. Las cifras generales siguen en Reportes y en el Tablero.
        </Typography>
      </Box>
    </Box>
  );
}
