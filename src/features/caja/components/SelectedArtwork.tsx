"use client";

import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { eyebrow, FDM } from "@/app/theme";
import { formatCOP } from "@/utils/money";
import { artistName, imageOf, stockOf, type CajaArtwork } from "../model/artwork";

/** Ficha corta de la obra que se va a cobrar. */
export function SelectedArtwork({
  artwork,
  outsidePavilion,
  onChange,
}: {
  artwork: CajaArtwork;
  /** La obra es de un pabellón que esta cajera no cobra. */
  outsidePavilion?: boolean;
  onChange: () => void;
}) {
  const img = imageOf(artwork);
  const stock = stockOf(artwork);
  const facts = [
    artwork.techniqueInfo?.name,
    artwork.dimensionsText,
    artwork.pavilionInfo?.name,
  ].filter(Boolean);

  return (
    <Stack spacing={1.5}>
      <Box sx={{ display: "flex", gap: 1.5 }}>
        <Box
          sx={{
            width: { xs: 96, sm: 120 },
            aspectRatio: "1",
            flexShrink: 0,
            bgcolor: "action.hover",
            backgroundImage: img ? `url(${img})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ ...eyebrow, color: "text.secondary" }}>{artistName(artwork) || "Artista"}</Typography>
          <Typography sx={{ fontSize: 18, lineHeight: 1.25, mt: 0.25 }}>{artwork.title || "Sin título"}</Typography>
          {facts.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {facts.join(" · ")}
            </Typography>
          )}
          <Typography sx={{ fontSize: 22, fontWeight: 300, mt: 0.75, fontVariantNumeric: "tabular-nums" }}>
            {formatCOP(artwork.price, { currency: artwork.currency })}
          </Typography>
          <Typography variant="caption" sx={{ color: stock > 0 ? "text.secondary" : FDM.terracotta }}>
            {stock > 0 ? `${stock} disponible${stock > 1 ? "s" : ""}` : "Vendida"}
            {artwork.tagId ? ` · ${artwork.tagId}` : ""}
          </Typography>
        </Box>
      </Box>
      {outsidePavilion && (
        <Alert severity="warning">Esta obra es de otro pabellón. Cóbrala en la caja de ese pabellón.</Alert>
      )}
      <Button size="small" onClick={onChange} sx={{ alignSelf: "flex-start" }}>
        Cambiar obra
      </Button>
    </Stack>
  );
}
