"use client";

import React, { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Stack,
  Typography,
  Box,
  Dialog,
  DialogContent,
  IconButton,
} from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import CloseIcon from "@mui/icons-material/Close";
import type { ArtworkRow } from "@hooks/useArtworksCursor";
import type { ArtworkDetailResponse } from "@services/artworks.service";

type ManualOrderDetailProps = {
  selectedArtwork: ArtworkRow | null;
  artworkDetail?: ArtworkDetailResponse;
  formatMoney: (amount?: number, currency?: string) => string;
};

export const ManualOrderDetail: React.FC<ManualOrderDetailProps> = ({
  selectedArtwork,
  artworkDetail,
  formatMoney,
}) => {
  // soporte para respuestas diferentes: { artwork } o { doc }
  const baseArtwork: any =
    (artworkDetail as any)?.artwork ??
    (artworkDetail as any)?.doc ??
    selectedArtwork ??
    null;

  const detailTitle: string =
    baseArtwork?.title ?? selectedArtwork?.title ?? "";

  const detailPrice: number | undefined =
    baseArtwork?.price ?? selectedArtwork?.price;

  const detailCurrency: string =
    baseArtwork?.currency ?? selectedArtwork?.currency ?? "COP";

  const detailDescription: string | undefined =
    baseArtwork?.description ?? selectedArtwork?.description;

  const artistName: string =
    (artworkDetail as any)?.artist
      ? `${(artworkDetail as any).artist.firstName ?? ""} ${(artworkDetail as any).artist.lastName ?? ""
        }`.trim()
      : selectedArtwork?.artistInfo
        ? `${selectedArtwork.artistInfo.firstName ?? ""} ${selectedArtwork.artistInfo.lastName ?? ""
          }`.trim()
        : "";

  const techniqueName: string | undefined =
    (artworkDetail as any)?.technique?.name ??
    selectedArtwork?.techniqueInfo?.name;

  const pavilionName: string | undefined =
    (artworkDetail as any)?.pavilion?.name ??
    selectedArtwork?.pavilionInfo?.name;

  const copies = (artworkDetail as any)?.copies as
    | { _id: string; status?: string; number?: number; total?: number }[]
    | undefined;

  const availableCopies = copies?.filter((c) => c.status === "available")
    .length;

  // ── imagen principal ──────────────────────────────────────────────
  const imageUrl: string | undefined = useMemo(() => {
    if (!baseArtwork) return undefined;
    if (typeof baseArtwork.image === "string") return baseArtwork.image;

    if (Array.isArray(baseArtwork.images) && baseArtwork.images.length > 0) {
      const first = baseArtwork.images[0];
      if (typeof first === "string") return first;
      if (first?.url) return first.url;
    }
    return undefined;
  }, [baseArtwork]);

  const [openImage, setOpenImage] = useState(false);

  return (
    <>
      <Card
        sx={{
          borderRadius: 3,
          border: "1px solid rgba(0,0,0,0.04)",
        }}
      >
        <CardHeader
          title={selectedArtwork ? "Detalle de la obra" : "Selecciona una obra"}
          sx={{
            pb: 1,
            "& .MuiCardHeader-title": {
              fontWeight: 700,
              fontSize: 16,
            },
          }}
        />
        <CardContent>
          {selectedArtwork && baseArtwork ? (
            <Stack
              spacing={2}
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "flex-start" }}
            >
              {/* Imagen a la izquierda */}
              {imageUrl && (
                <Box
                  sx={{
                    flexShrink: 0,
                    width: { xs: "100%", sm: 220 },
                    borderRadius: 2,
                    overflow: "hidden",
                    position: "relative",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  }}
                >
                  <Box
                    component="img"
                    src={imageUrl}
                    alt={detailTitle || "Obra"}
                    sx={{
                      width: "100%",
                      height: "100%",
                      maxHeight: 260,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => setOpenImage(true)}
                    sx={{
                      position: "absolute",
                      bottom: 8,
                      right: 8,
                      bgcolor: "rgba(0,0,0,0.65)",
                      color: "#fff",
                      "&:hover": { bgcolor: "rgba(0,0,0,0.85)" },
                    }}
                  >
                    <ZoomInIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}

              {/* Texto a la derecha */}
              <Stack spacing={1.5} sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {detailTitle}
                </Typography>

                {artistName && (
                  <Typography variant="body2" color="text.secondary">
                    {artistName}
                  </Typography>
                )}

                {techniqueName && (
                  <Typography variant="body2" color="text.secondary">
                    {`Técnica: ${techniqueName}`}
                  </Typography>
                )}

                {pavilionName && (
                  <Typography variant="body2" color="text.secondary">
                    {`Pabellón: ${pavilionName}`}
                  </Typography>
                )}

                {typeof detailPrice === "number" && (
                  <Typography variant="h6" mt={1}>
                    {formatMoney(detailPrice, detailCurrency)}
                  </Typography>
                )}

                {copies && copies.length > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Copias disponibles: {availableCopies ?? 0} / {copies.length}
                  </Typography>
                )}

                {detailDescription && (
                  <Typography variant="body2" mt={1}>
                    {detailDescription}
                  </Typography>
                )}
              </Stack>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No hay obra seleccionada. Elige una de la tabla de la izquierda
              para ver el detalle.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Modal de imagen grande */}
      <Dialog
        open={openImage}
        onClose={() => setOpenImage(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent
          sx={{
            position: "relative",
            p: 0,
            bgcolor: "black",
          }}
        >
          <IconButton
            onClick={() => setOpenImage(false)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 1,
              bgcolor: "rgba(0,0,0,0.6)",
              color: "#fff",
              "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
            }}
          >
            <CloseIcon />
          </IconButton>

          {imageUrl && (
            <Box
              component="img"
              src={imageUrl}
              alt={detailTitle || "Obra"}
              sx={{
                width: "100%",
                height: "auto",
                maxHeight: "80vh",
                objectFit: "contain",
                display: "block",
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
