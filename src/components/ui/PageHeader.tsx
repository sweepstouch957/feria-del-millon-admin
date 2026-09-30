"use client";

import * as React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { eyebrow } from "@/app/theme";

/* Encabezado de página del panel: versalita de sección, título liviano,
   insignia opcional, una línea de contexto y los botones de acción a la
   derecha. Todas las páginas lo usan para que el ritmo sea el mismo. */

export type PageAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  /** "pri" tinta llena, "acc" acento, "sec" filete. */
  kind?: "pri" | "acc" | "sec";
  disabled?: boolean;
  icon?: React.ReactNode;
};

export default function PageHeader({
  crumb,
  title,
  badge,
  description,
  actions = [],
  back,
  backLabel = "Volver",
  children,
}: {
  crumb?: string;
  title: React.ReactNode;
  /** Chip/insignia al lado del título (estado de la feria, "en vivo"…). */
  badge?: React.ReactNode;
  description?: React.ReactNode;
  actions?: PageAction[];
  /** Ruta del enlace de regreso; si falta, no se pinta. */
  back?: string;
  backLabel?: string;
  /** Controles propios de la página (filtros, selector de feria…). */
  children?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      alignItems={{ xs: "stretch", md: "flex-end" }}
      justifyContent="space-between"
      gap={2}
      sx={{ mb: { xs: 2.5, md: 3.5 } }}
    >
      <Box sx={{ minWidth: 0 }}>
        {back && (
          <Box
            component="button"
            type="button"
            onClick={() => router.push(back)}
            sx={{
              ...eyebrow,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              mb: 1,
              background: "transparent",
              border: 0,
              p: 0,
              cursor: "pointer",
              color: "text.secondary",
              fontSize: 10,
              "&:hover": { color: "primary.main" },
            }}
          >
            <ArrowLeft size={13} strokeWidth={1.5} />
            {backLabel}
          </Box>
        )}

        {crumb && (
          <Typography sx={{ ...eyebrow, color: "text.secondary", fontSize: 10 }}>
            {crumb}
          </Typography>
        )}

        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.5} sx={{ mt: 0.75 }}>
          <Typography variant="h3" component="h1" sx={{ minWidth: 0 }}>
            {title}
          </Typography>
          {badge}
        </Stack>

        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 680 }}>
            {description}
          </Typography>
        )}

        {children && <Box sx={{ mt: 1.5 }}>{children}</Box>}
      </Box>

      {actions.length > 0 && (
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ flexShrink: 0 }}>
          {actions.map((a) => (
            <Button
              key={a.label}
              size="small"
              startIcon={a.icon}
              disabled={a.disabled}
              onClick={a.onClick ?? (a.href ? () => router.push(a.href as string) : undefined)}
              variant={a.kind === "sec" || !a.kind ? "outlined" : "contained"}
              color={a.kind === "acc" ? "primary" : "secondary"}
            >
              {a.label}
            </Button>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
