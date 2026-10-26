"use client";

import { Box, Dialog, IconButton, Typography } from "@mui/material";
import { X } from "lucide-react";

/** Imagen a pantalla completa para confirmar con el comprador que es esa obra. */
export function ImageLightbox({
  src,
  caption,
  open,
  onClose,
}: {
  src?: string;
  caption?: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open && !!src} onClose={onClose} fullScreen slotProps={{ paper: { sx: { bgcolor: "#000" } } }}>
      <Box onClick={onClose} sx={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", cursor: "zoom-out" }}>
        <IconButton aria-label="Cerrar" onClick={onClose} sx={{ position: "absolute", top: 12, right: 12, color: "#fff", bgcolor: "rgba(255,255,255,0.12)", zIndex: 1 }}>
          <X size={24} />
        </IconButton>
        <Box component="img" src={src} alt={caption} sx={{ flex: 1, minHeight: 0, width: "100%", objectFit: "contain" }} />
        {caption && (
          <Typography sx={{ color: "#fff", textAlign: "center", py: 1.5, px: 2, fontSize: 16 }}>{caption}</Typography>
        )}
      </Box>
    </Dialog>
  );
}
