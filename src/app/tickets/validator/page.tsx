"use client";

import { Box, Typography, Stack, Button } from "@mui/material";
import Link from "next/link";
import { QrValidationPanel } from "@/components/admin/tickets/QrValidationPanel";
import { ArrowBack } from "@mui/icons-material";

export default function QrValidatorPage() {
  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        maxWidth: 800,
        mx: "auto",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
        spacing={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} mb={0.5}>
            Validador de entradas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Escanea los códigos QR para permitir o rechazar el acceso al evento.
          </Typography>
        </Box>

        <Button
          component={Link}
          href="/tickets"
          variant="outlined"
          startIcon={<ArrowBack />}
          sx={{ whiteSpace: "nowrap" }}
        >
          Volver a gestión
        </Button>
      </Stack>

      {/* Centro el panel y lo dejo respirar */}
      <Box
        sx={{
          mt: 2,
          mb: 4,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <QrValidationPanel />
      </Box>
    </Box>
  );
}
