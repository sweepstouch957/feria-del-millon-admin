"use client";

import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { FDM, eyebrow } from "@/app/theme";

/* Pantalla de espera de la sesión: tinta plena y una versalita, igual que la
   del acceso. Sin tarjeta ni sombra. */

export default function LoadingScreen({ label = "Cargando…" }: { label?: string }) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        backgroundColor: FDM.panel,
        px: 2,
      }}
    >
      <Stack alignItems="center" spacing={2.5}>
        <CircularProgress size={26} sx={{ color: FDM.green }} />
        <Typography sx={{ ...eyebrow, fontSize: 10, color: "rgba(245,244,239,0.65)" }}>
          {label}
        </Typography>
      </Stack>
    </Box>
  );
}
