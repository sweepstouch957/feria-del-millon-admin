"use client";

import {
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
  Stack,
  Paper,
} from "@mui/material";
import React from "react";

export default function LoadingScreen({
  label = "Cargando…",
}: {
  label?: string;
}) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: (t) => t.palette.background.default,
      }}
    >
      <Box sx={{ width: 360, maxWidth: "90vw" }}>
        <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />
        <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress size={48} />
            <Typography variant="h6" fontWeight={700}>
              {label}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
            >
              Preparando tu espacio de trabajo. Esto puede tomar unos segundos.
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
