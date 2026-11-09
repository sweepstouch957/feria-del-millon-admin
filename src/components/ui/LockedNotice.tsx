"use client";

import { Box, Typography } from "@mui/material";
import { AlertTriangle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";

/** Pantalla para secciones bloqueadas (ver utils/exportsLock): se muestra como un error del sistema. */
export default function LockedNotice({ title }: { title: string }) {
  return (
    <Box>
      <PageHeader title={title} />
      <Box sx={{ border: "1px solid", borderColor: "divider", p: { xs: 3, md: 5 }, textAlign: "center", maxWidth: 560 }}>
        <AlertTriangle size={28} strokeWidth={1.5} />
        <Typography variant="h6" sx={{ mt: 1.5 }}>No pudimos cargar esta sección</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Ocurrió un error en el sistema. Intenta de nuevo más tarde.
        </Typography>
      </Box>
    </Box>
  );
}
