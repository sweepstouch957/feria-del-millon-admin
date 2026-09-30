"use client";

import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { eyebrow } from "@/app/theme";

type Props = { text?: string };

/** Espera dentro del marco del panel: fondo de papel, sin bloque de color. */
export default function ScreenFallback({ text = "Cargando…" }: Props) {
  return (
    <Box
      sx={{
        minHeight: "50vh",
        display: "grid",
        placeItems: "center",
        px: 2,
      }}
    >
      <Stack alignItems="center" spacing={2}>
        <CircularProgress size={24} />
        <Typography sx={{ ...eyebrow, fontSize: 10, color: "text.secondary" }}>{text}</Typography>
      </Stack>
    </Box>
  );
}
