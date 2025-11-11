"use client";

import { Box, Stack, CircularProgress, Typography } from "@mui/material";

type Props = { text?: string };

export default function ScreenFallback({ text = "Cargando…" }: Props) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: (t) =>
          t.palette.mode === "dark" ? "#0b0b0b" : "#f5f5f5",
        px: 2,
      }}
    >
      <Stack alignItems="center" spacing={2}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          {text}
        </Typography>
      </Stack>
    </Box>
  );
}
