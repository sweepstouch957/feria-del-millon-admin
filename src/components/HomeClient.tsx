"use client";

import React from "react";
import { Box, Paper, Typography, Stack, Divider } from "@mui/material";
import Image from "next/image";

const DashboardPage: React.FC = () => {
  return (
    <Box>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ color: "#424242", fontWeight: "bold" }}
      >
        Feria del Millón
      </Typography>

      <Paper
        sx={{
          p: 4,
          borderRadius: 2,
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
          border: "1px dashed rgba(0,0,0,0.15)",
          bgcolor: "#ffffff",
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <Image
            src="/logo.png"
            alt="Feria del Millón"
            width={72}
            height={72}
            style={{ objectFit: "contain", opacity: 0.9 }}
          />

          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: "#424242", textAlign: "center" }}
          >
            Coming Soon — Feria del Millón
          </Typography>

          <Typography
            variant="body2"
            sx={{ color: "#616161", textAlign: "center", maxWidth: 560 }}
          >
            Estamos preparando tu panel para gestionar <b>Obras</b>,{" "}
            <b>Artistas</b>,<b> Eventos</b> y <b>Ventas</b>. Muy pronto tendrás
            aquí métricas, gráficos y accesos directos — todo en un diseño
            limpio y minimalista.
          </Typography>

          <Divider
            sx={{ width: "100%", my: 1, borderColor: "rgba(0,0,0,0.06)" }}
          />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
              gap: 2,
              width: "100%",
            }}
          >
            {/* Placeholders sutiles */}
            {["Obras", "Artistas", "Eventos"].map((title) => (
              <Paper
                key={title}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "#f5f5f5",
                  border: "1px solid rgba(0,0,0,0.06)",
                  minHeight: 84,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Typography variant="body2" sx={{ color: "#757575" }}>
                  {title} — próximamente
                </Typography>
              </Paper>
            ))}
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default DashboardPage;
