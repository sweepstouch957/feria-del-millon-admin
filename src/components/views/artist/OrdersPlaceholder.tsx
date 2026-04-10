"use client";

import { Box, Typography, Paper } from "@mui/material";

export default function OrdersPlaceholder() {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        p: 4,
        textAlign: "center",
        color: "text.secondary",
      }}
    >
      <Box sx={{ maxWidth: 480, mx: "auto" }}>
        <Typography variant="h6" gutterBottom>
          Órdenes
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Aquí aparecerán las órdenes asociadas a tus obras. Próximamente podrás
          ver estados, compradores y descargar comprobantes.
        </Typography>
        <Typography variant="caption" color="text.disabled">
          (Placeholder – sin datos por ahora)
        </Typography>
      </Box>
    </Paper>
  );
}
