"use client";

import { memo } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { FDM } from "@/app/theme";
import { formatCOP } from "@/utils/money";
import { artistName, stockOf, thumbOf, type CajaArtwork } from "../model/artwork";

const ellipsis = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const;

/** Tarjeta tocable: foto 4:3 con disponibilidad, título, artista · técnica, precio y código. */
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
  const img = thumbOf(artwork);
  const avail = soldOut ? "Vendida" : stock > 1 ? `${stock} disp.` : "Pieza única";

  return (
    <ButtonBase
      onClick={() => onPick(artwork)}
      disabled={soldOut}
      aria-pressed={selected}
      sx={(t) => ({
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        textAlign: "left",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1.5px solid",
        borderColor: selected ? FDM.green : t.palette.divider,
        bgcolor: "background.paper",
        boxShadow: selected ? "0 0 0 3px rgba(63,164,110,.25)" : "none",
        opacity: soldOut ? 0.5 : 1,
        transition: "transform .15s ease, box-shadow .15s ease, border-color .15s ease",
        "@media (hover: hover)": {
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: selected ? "0 0 0 3px rgba(63,164,110,.25)" : "0 14px 28px -18px rgba(11,11,10,.35)",
            borderColor: selected ? FDM.green : t.palette.text.disabled,
          },
        },
      })}
    >
      <Box
        sx={(t) => ({
          position: "relative",
          aspectRatio: "4 / 3",
          background: t.palette.mode === "dark"
            ? "repeating-linear-gradient(135deg,#232321 0 10px,#1C1C1A 10px 20px)"
            : "repeating-linear-gradient(135deg,#E6E4DC 0 10px,#DDDBD2 10px 20px)",
        })}
      >
        {img && (
          <Box component="img" src={img} alt="" loading="lazy" decoding="async"
            sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        <Box
          component="span"
          sx={(t) => {
            const inv = t.palette.mode === "dark";
            const bg = soldOut ? FDM.terracotta : stock > 1 ? FDM.green : inv ? "#F5F4EF" : "#0B0B0A";
            const fg = soldOut ? "#fff" : stock > 1 ? "#0B0B0A" : inv ? "#0B0B0A" : "#F5F4EF";
            return { position: "absolute", top: 8, left: 8, fontSize: { xs: 10, sm: 11 }, fontWeight: 600, px: 1, py: 0.5, borderRadius: 999, bgcolor: bg, color: fg };
          }}
        >
          {avail}
        </Box>
        {selected && (
          <Box component="span" aria-hidden
            sx={{ position: "absolute", top: 10, right: 10, width: 24, height: 24, borderRadius: "50%", bgcolor: FDM.green, color: "#0B0B0A", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700 }}>
            ✓
          </Box>
        )}
      </Box>
      <Box sx={{ p: { xs: "8px 10px 10px", sm: "12px 14px 14px" }, display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0 }}>
        <Typography title={artwork.title} sx={{ fontSize: { xs: 14, sm: 15 }, fontWeight: 600, lineHeight: 1.25, ...ellipsis }}>
          {artwork.title || "Sin título"}
        </Typography>
        <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: "text.secondary", ...ellipsis }}>
          {artistName(artwork) || "—"}
          {artwork.techniqueInfo?.name ? ` · ${artwork.techniqueInfo.name}` : ""}
        </Typography>
        {/* Celular: precio arriba y código debajo; lado a lado no cabían en media pantalla. */}
        <Box sx={{ mt: 0.75, display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "flex-start", sm: "baseline" }, justifyContent: "space-between", gap: { xs: 0.25, sm: 1 }, minWidth: 0 }}>
          <Typography sx={{ fontSize: { xs: 15, sm: 16 }, fontWeight: 600, letterSpacing: "-.01em", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {formatCOP(artwork.price, { currency: artwork.currency })}
          </Typography>
          {artwork.tagId && (
            <Typography sx={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, color: "text.disabled", maxWidth: "100%", ...ellipsis }}>
              {artwork.tagId}
            </Typography>
          )}
        </Box>
      </Box>
    </ButtonBase>
  );
});
