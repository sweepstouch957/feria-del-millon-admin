"use client";

import { memo } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { FDM } from "@/app/theme";
import { formatCOP } from "@/utils/money";
import { artistName, imageOf, stockOf, type CajaArtwork } from "../model/artwork";

/** Fila tocable de la lista: miniatura, título, artista, código y precio. */
export const ArtworkCard = memo(function ArtworkCard({
  artwork,
  selected,
  onPick,
}: {
  artwork: CajaArtwork;
  selected: boolean;
  onPick: (a: CajaArtwork) => void;
}) {
  const stock = stockOf(artwork);
  const soldOut = stock <= 0;
  const img = imageOf(artwork);

  return (
    <ButtonBase
      onClick={() => onPick(artwork)}
      disabled={soldOut}
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "stretch",
        gap: 1.5,
        p: 1,
        textAlign: "left",
        border: "1px solid",
        borderColor: selected ? FDM.green : "divider",
        outline: selected ? `1px solid ${FDM.green}` : "none",
        bgcolor: "background.paper",
        opacity: soldOut ? 0.5 : 1,
        "&:hover": { borderColor: "text.primary" },
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          flexShrink: 0,
          bgcolor: "action.hover",
          backgroundImage: img ? `url(${img})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <Box sx={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 0.25 }}>
        <Typography noWrap sx={{ fontSize: 15 }}>{artwork.title || "Sin título"}</Typography>
        <Typography noWrap variant="body2" color="text.secondary">
          {artistName(artwork) || "—"}
          {artwork.techniqueInfo?.name ? ` · ${artwork.techniqueInfo.name}` : ""}
        </Typography>
        <Box sx={{ mt: "auto", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
            {formatCOP(artwork.price, { currency: artwork.currency })}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: soldOut ? FDM.terracotta : "text.secondary", fontWeight: soldOut ? 600 : 400 }}
          >
            {soldOut ? "Vendida" : stock > 1 ? `${stock} disp.` : "Pieza única"}
          </Typography>
        </Box>
        {artwork.tagId && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontFamily: "monospace" }}>
            {artwork.tagId}
          </Typography>
        )}
      </Box>
    </ButtonBase>
  );
});
