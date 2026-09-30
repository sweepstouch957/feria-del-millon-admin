"use client";

import * as React from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { eyebrow } from "@/app/theme";

/* Franja de cifras del diseño: una rejilla con filetes de 1px hechos con el
   propio hueco (gap sobre fondo de filete), sin tarjetas ni sombras. */

export type Kpi = {
  label: string;
  value: React.ReactNode;
  /** Línea de detalle bajo la cifra. */
  sub?: React.ReactNode;
  /** Tiñe la cifra con el acento (para totales). */
  accent?: boolean;
  /** Si la celda filtra la tabla de abajo, se vuelve pulsable. */
  onClick?: () => void;
  /** Marca la celda como el filtro vigente. */
  selected?: boolean;
};

export default function KpiStrip({
  items,
  loading = false,
  min = 170,
}: {
  items: Kpi[];
  loading?: boolean;
  /** Ancho mínimo de cada celda antes de bajar a la fila siguiente. */
  min?: number;
}) {
  if (!items.length) return null;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
        gap: "1px",
        mb: { xs: 2, md: 3 },
        backgroundColor: "divider",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      {items.map((k) => {
        const text = typeof k.value === "string" || typeof k.value === "number" ? String(k.value) : "";
        return (
          <Box
            key={k.label}
            component={k.onClick ? "button" : "div"}
            type={k.onClick ? "button" : undefined}
            onClick={k.onClick}
            sx={{
              minWidth: 0,
              px: 2.25,
              pt: 1.75,
              pb: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              textAlign: "left",
              gap: 0.75,
              border: 0,
              font: "inherit",
              color: "inherit",
              backgroundColor: "background.default",
              ...(k.onClick && {
                cursor: "pointer",
                transition: "background-color .2s ease, box-shadow .2s ease",
                boxShadow: k.selected ? "inset 0 -2px 0 currentColor" : "none",
                "&:hover": { backgroundColor: "action.hover" },
              }),
            }}
          >
            <Typography sx={{ ...eyebrow, fontSize: 9.5, letterSpacing: "0.22em", color: "text.secondary" }}>
              {k.label}
            </Typography>

            {loading ? (
              <Skeleton variant="text" width="60%" height={34} />
            ) : (
              <Typography
                component="div"
                sx={{
                  fontWeight: 200,
                  lineHeight: 1.2,
                  letterSpacing: "0.01em",
                  // Las cifras largas (importes) bajan de cuerpo para no cortarse.
                  fontSize: text.length > 7 ? "clamp(18px, 1.7vw, 22px)" : 30,
                  color: k.accent ? "primary.main" : "text.primary",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {k.value}
              </Typography>
            )}

            {k.sub && (
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                {k.sub}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
