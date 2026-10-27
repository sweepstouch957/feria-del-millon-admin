"use client";

import { useState } from "react";
import { Alert, Box, Button, ButtonBase, Stack, Typography } from "@mui/material";
import { Maximize2 } from "lucide-react";
import { ImageLightbox } from "./ImageLightbox";
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
  const [zoom, setZoom] = useState(false);
  const facts = [
    artwork.techniqueInfo?.name,
    artwork.dimensionsText,
    artwork.pavilionInfo?.name,
  ].filter(Boolean);

  return (
    <Stack spacing={1.5}>
      <Box sx={{ display: "flex", gap: 1.5 }}>
        <ButtonBase
          aria-label="Ver la imagen en grande"
          onClick={() => setZoom(true)}
          disabled={!img}
          sx={{
            position: "relative",
            width: { xs: 120, sm: 160 },
            aspectRatio: "1",
            flexShrink: 0,
            bgcolor: "action.hover",
            backgroundImage: img ? `url(${img})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            cursor: "zoom-in",
          }}
        >
          {img && (
            <Box sx={{ position: "absolute", right: 6, bottom: 6, p: 0.5, display: "flex", bgcolor: "rgba(0,0,0,0.6)", color: "#fff" }}>
              <Maximize2 size={16} />
            </Box>
          )}
        </ButtonBase>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ ...eyebrow, color: "text.secondary" }}>{artistName(artwork) || "Artista"}</Typography>
          <Typography sx={{ fontSize: 18, lineHeight: 1.25, mt: 0.25, overflowWrap: "anywhere" }}>{artwork.title || "Sin título"}</Typography>
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
      <ImageLightbox
        src={img}
        caption={[artwork.title, artistName(artwork)].filter(Boolean).join(" · ")}
        open={zoom}
        onClose={() => setZoom(false)}
      />
    </Stack>
  );
}
