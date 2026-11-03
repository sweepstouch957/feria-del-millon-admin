"use client";

import * as React from "react";
import { Box, Skeleton, Tooltip, Typography } from "@mui/material";
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
  /** Qué significa la cifra: sale al pasar el mouse. */
  hint?: string;
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

  // Un solo cuerpo para toda la franja, según la cifra más larga y el ancho de
  // la celda (cqi): antes cada cifra elegía el suyo y "COP 0" salía grande
  // mientras "COP 22.880.000" se cortaba. 0.62em ≈ ancho de un dígito en Jost 200.
  const longest = Math.max(
    4,
    ...items.map((k) => (typeof k.value === "string" || typeof k.value === "number" ? String(k.value).length : 4)),
  );
  const valueSize = `clamp(16px, calc(100cqi / ${(longest * 0.62).toFixed(2)}), 30px)`;

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
        return (
          <Tooltip key={k.label} title={k.hint || ""} arrow placement="top" disableInteractive>
          <Box
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
              {k.hint && <Box component="span" sx={{ ml: 0.75, opacity: 0.6, letterSpacing: 0 }}>ⓘ</Box>}
            </Typography>

            <Box sx={{ alignSelf: "stretch", containerType: "inline-size" }}>
              {loading ? (
                <Skeleton variant="text" width="60%" height={34} />
              ) : (
                <Typography
                  component="div"
                  sx={{
                    fontWeight: 200,
                    lineHeight: 1.2,
                    letterSpacing: "0.01em",
                    fontSize: valueSize,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color: k.accent ? "primary.main" : "text.primary",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {k.value}
                </Typography>
              )}
            </Box>

            {k.sub && (
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                {k.sub}
              </Typography>
            )}
          </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}
