"use client";

import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import QRCode from "qrcode";

/** QR para escanear desde otra pantalla o impreso, con su título y lo que debe pasar. */
export function QrTile({ value, title, caption, image }: { value: string; title: string; caption?: string; image?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(value, { width: 360, margin: 1 }).then(setSrc).catch(() => setSrc(""));
  }, [value]);

  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", p: 1.5, breakInside: "avoid", minWidth: 0 }}>
      <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", mb: 1 }}>
        {image && (
          <Box component="img" src={image} alt="" sx={{ width: 44, height: 44, objectFit: "cover", flexShrink: 0 }} />
        )}
        <Typography
          fontWeight={600}
          fontSize={14}
          sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {title}
        </Typography>
      </Box>
      {/* Fondo blanco siempre: en tema oscuro la cámara no lee un QR invertido. */}
      <Box sx={{ bgcolor: "#fff", p: 1, display: "grid", placeItems: "center" }}>
        {src ? <Box component="img" src={src} alt={title} sx={{ width: "100%", maxWidth: 220, aspectRatio: "1" }} /> : <Box sx={{ aspectRatio: "1", width: "100%" }} />}
      </Box>
      {caption && (
        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
          {caption}
        </Typography>
      )}
    </Box>
  );
}
