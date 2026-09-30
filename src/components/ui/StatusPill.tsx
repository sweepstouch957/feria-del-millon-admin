"use client";

import * as React from "react";
import { Box } from "@mui/material";

/* Píldora de estado del diseño: solo filete y texto en versalitas.
   Tres tonos: ok (acento), bad (terracota) y neutro. */

export type PillTone = "ok" | "bad" | "warn" | "mid";

const TONE: Record<PillTone, string> = {
  ok: "success.main",
  bad: "error.main",
  warn: "warning.main",
  mid: "text.secondary",
};

export default function StatusPill({
  label,
  tone = "mid",
  dot = false,
}: {
  label: React.ReactNode;
  tone?: PillTone;
  /** Punto lleno a la izquierda, para estados "en vivo". */
  dot?: boolean;
}) {
  const color = TONE[tone];
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.9,
        height: 22,
        px: 1.25,
        borderRadius: 999,
        border: "1px solid",
        borderColor: tone === "mid" ? "divider" : color,
        color,
        fontSize: 9.5,
        fontWeight: 500,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {dot && (
        <Box component="span" sx={{ width: 5, height: 5, borderRadius: 999, backgroundColor: color }} />
      )}
      {label}
    </Box>
  );
}
