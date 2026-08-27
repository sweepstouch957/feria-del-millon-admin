"use client";

import * as React from "react";
import { Box, Stack, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { eyebrow } from "@/app/theme";

/* ──────────────────────────────────────────────────────────────────────
   Una tabla en un teléfono es scroll horizontal y nada más. Este
   componente muestra la tabla en escritorio y, en pantallas chicas,
   una lista de fichas donde cada fila se lee de arriba abajo.

   Cada página decide qué campos importan en móvil: no es lo mismo la
   columna que se sacrifica en una tabla de usuarios que en una de obras.
   ────────────────────────────────────────────────────────────────────── */

export type MobileField = {
  label: string;
  /** Si es falsy, el campo no se pinta: evita filas "—" sin información. */
  value: React.ReactNode;
};

export type MobileCard = {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Chip de estado, arriba a la derecha. */
  badge?: React.ReactNode;
  fields?: MobileField[];
  actions?: React.ReactNode;
  onClick?: () => void;
};

export function ResponsiveRows({
  cards,
  children,
  emptyText = "No hay registros.",
  loading = false,
  breakpoint = "md",
}: {
  cards: MobileCard[];
  /** La tabla o DataGrid de escritorio. */
  children: React.ReactNode;
  emptyText?: string;
  loading?: boolean;
  breakpoint?: "sm" | "md" | "lg";
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(breakpoint));

  if (!isMobile) return <>{children}</>;

  if (loading) {
    return (
      <Stack spacing={1.5} sx={{ py: 2 }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              height: 96,
              border: `1px solid ${theme.palette.divider}`,
              opacity: 0.5,
            }}
          />
        ))}
      </Stack>
    );
  }

  if (!cards.length) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <Typography sx={{ fontSize: 14, color: "text.secondary" }}>{emptyText}</Typography>
      </Box>
    );
  }

  return (
    <Stack sx={{ borderTop: `1px solid ${theme.palette.divider}` }}>
      {cards.map((c) => (
        <Box
          key={c.id}
          onClick={c.onClick}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            py: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            cursor: c.onClick ? "pointer" : "default",
          }}
        >
          <Stack direction="row" flexWrap="wrap" alignItems="flex-start" justifyContent="space-between" gap={1.5}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 500, fontSize: 16, lineHeight: 1.3 }}>
                {c.title}
              </Typography>
              {c.subtitle && (
                <Typography sx={{ fontSize: 13.5, color: "text.secondary", mt: 0.25 }}>
                  {c.subtitle}
                </Typography>
              )}
            </Box>
            {c.badge}
          </Stack>

          {!!c.fields?.length && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 0.5 }}>
              {c.fields
                .filter((f) => f.value !== null && f.value !== undefined && f.value !== "")
                .map((f) => (
                  <Stack
                    key={f.label}
                    direction="row" flexWrap="wrap"
                    alignItems="baseline"
                    gap={1.5}
                    sx={{ minWidth: 0 }}
                  >
                    <Typography
                      sx={{ ...eyebrow, fontSize: 9, color: "text.secondary", flex: "0 0 38%" }}
                    >
                      {f.label}
                    </Typography>
                    <Typography sx={{ fontSize: 14, flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                      {f.value}
                    </Typography>
                  </Stack>
                ))}
            </Box>
          )}

          {c.actions && (
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
              {c.actions}
            </Stack>
          )}
        </Box>
      ))}
    </Stack>
  );
}

export default ResponsiveRows;
