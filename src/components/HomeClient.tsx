"use client";

import React from "react";
import { Box, Paper, Typography, Stack, Divider } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Image from "next/image";

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ color: "text.primary", fontWeight: "bold" }}
      >
        Feria del Millón
      </Typography>

      <Paper
        sx={{
          p: 4,
          borderRadius: 2,
          boxShadow: isDark
            ? "0 2px 10px rgba(0,0,0,0.4)"
            : "0 2px 10px rgba(0,0,0,0.08)",
          border: isDark
            ? "1px dashed rgba(255,255,255,0.1)"
            : "1px dashed rgba(0,0,0,0.15)",
          bgcolor: isDark ? "#111113" : "#ffffff",
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <Image
            src="/logo.png"
            alt="Feria del Millón"
            width={72}
            height={72}
            style={{
              objectFit: "contain",
              opacity: 0.9,
              filter: isDark ? "invert(1) brightness(1.2)" : "none",
            }}
          />

          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: "text.primary", textAlign: "center" }}
          >
            Coming Soon — Feria del Millón
          </Typography>

          <Typography
            variant="body2"
            sx={{ color: "text.secondary", textAlign: "center", maxWidth: 560 }}
          >
            Estamos preparando tu panel para gestionar <b>Obras</b>,{" "}
            <b>Artistas</b>,<b> Eventos</b> y <b>Ventas</b>. Muy pronto tendrás
            aquí métricas, gráficos y accesos directos — todo en un diseño
            limpio y minimalista.
          </Typography>

          <Divider
            sx={{ width: "100%", my: 1, borderColor: "divider" }}
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
                  bgcolor: isDark ? "rgba(255,255,255,0.03)" : "#f5f5f5",
                  border: isDark
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "1px solid rgba(0,0,0,0.06)",
                  minHeight: 84,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
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
