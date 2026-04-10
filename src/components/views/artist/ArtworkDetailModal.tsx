"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Stack,
  Chip,
} from "@mui/material";
import { X, Share2, QrCode, Plus, Minus, RefreshCw } from "lucide-react";
import type { ArtworkDetailResponse } from "@services/artworks.service";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

export default function ArtworkDetailModal({
  id,
  data,
  open,
  loading,
  onClose,
  onOpenQr,
}: {
  id: string | null;
  data?: ArtworkDetailResponse;
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onOpenQr?: (id: string) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const formatMoney = (n?: number, currency: string = "COP") =>
    typeof n === "number"
      ? new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
      }).format(n)
      : "—";

  const share = async () => {
    if (!id) return;
    const url = `${window.location.origin}/obra/${encodeURIComponent(id)}`;
    try {
      if (navigator.share)
        await navigator.share({ title: data?.doc.title || "Obra", url });
      else await navigator.clipboard.writeText(url);
    } catch {
      await navigator.clipboard.writeText(url);
    }
  };

  const handleOpenQr = () => {
    if (!id) return;
    if (onOpenQr) onOpenQr(id);
    else {
      const target =
        (data as any)?.doc?.meta?.qrPublic?.target ||
        (data as any)?.doc?.meta?.qrPublic?.imageUrl;
      if (target) window.open(String(target), "_blank");
    }
  };

  if (!open) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Detalle de la obra
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {loading ? (
            <Box
              sx={{
                py: 6,
                textAlign: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Cargando…
              </Typography>
            </Box>
          ) : !data ? (
            <Box
              sx={{
                py: 6,
                textAlign: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No se encontró la obra.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr" },
                gap: 3,
              }}
            >
              {/* Imagen */}
              <Box
                onClick={() => setPreviewOpen(true)}
                sx={{
                  position: "relative",
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "grey.200",
                  bgcolor: "grey.50",
                  overflow: "hidden",
                  cursor: data.doc.image ? "zoom-in" : "default",
                  minHeight: 260,
                }}
              >
                {data.doc.image ? (
                  <>
                    <Box
                      sx={{
                        position: "relative",
                        width: "100%",
                        pt: "75%", // 4:3
                      }}
                    >
                      <Image
                        src={data.doc.image}
                        alt={data.doc.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        style={{ objectFit: "contain" }}
                      />
                    </Box>
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        p: 1.5,
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.55), transparent)",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <Chip
                        label="Click para ampliar"
                        size="small"
                        sx={{
                          bgcolor: "rgba(0,0,0,0.6)",
                          color: "common.white",
                          fontSize: 11,
                        }}
                      />
                    </Box>
                  </>
                ) : (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Sin imagen
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Info */}
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, wordBreak: "break-word" }}
                >
                  {data.doc.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1, whiteSpace: "pre-line", wordBreak: "break-word" }}
                >
                  {data.doc.description || "—"}
                </Typography>

                <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {data.doc.year && (
                    <Chip
                      label={data.doc.year}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {typeof data.doc.stock === "number" && (
                    <Chip
                      label={`Stock: ${data.doc.stock}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>

                <Box
                  component="dl"
                  sx={{
                    mt: 3,
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    rowGap: 1,
                    columnGap: 2,
                    fontSize: 14,
                  }}
                >
                  <Typography component="dt" fontWeight={600}>
                    Técnica:
                  </Typography>
                  <Typography component="dd" color="text.secondary">
                    {data.doc.techniqueInfo?.name ||
                      data.doc.technique ||
                      "—"}
                  </Typography>

                  <Typography component="dt" fontWeight={600}>
                    Pabellón:
                  </Typography>
                  <Typography component="dd" color="text.secondary">
                    {data.doc.pavilionInfo?.name || "—"}
                  </Typography>

                  <Typography component="dt" fontWeight={600}>
                    Precio:
                  </Typography>
                  <Typography component="dd" color="text.secondary">
                    {formatMoney(data.doc.price, data.doc.currency)}
                  </Typography>

                  <Typography component="dt" fontWeight={600}>
                    Año:
                  </Typography>
                  <Typography component="dd" color="text.secondary">
                    {data.doc.year || "—"}
                  </Typography>

                  <Typography component="dt" fontWeight={600}>
                    TagId:
                  </Typography>
                  <Typography component="dd" color="text.secondary">
                    {(data as any)?.doc?.tagId || "—"}
                  </Typography>
                </Box>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mt: 3, flexWrap: "wrap" }}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={share}
                    startIcon={<Share2 className="w-4 h-4" />}
                  >
                    Compartir
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleOpenQr}
                    startIcon={<QrCode className="w-4 h-4" />}
                  >
                    Ver QR
                  </Button>
                </Stack>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {previewOpen && data?.doc.image && (
        <ImagePreviewModal
          src={data.doc.image}
          alt={data.doc.title}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
}

function ImagePreviewModal({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt?: string;
  onClose: () => void;
}) {
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth={false}
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: "rgba(0,0,0,0.9)",
        },
      }}
    >
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={4}
          wheel={{ step: 0.12 }}
          doubleClick={{ disabled: false, step: 0.6 }}
          pinch={{ step: 0.2 }}
          onTransformed={(ref: any) => {
            const s =
              ref?.state?.scale ??
              ref?.instance?.transformState?.scale ??
              1;
            setPreviewScale(s);
          }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Controles */}
              <Box
                sx={{
                  position: "fixed",
                  top: 16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "inline-flex",
                  alignItems: "center",
                  bgcolor: "rgba(255,255,255,0.95)",
                  borderRadius: 99,
                  boxShadow: 3,
                  px: 1,
                  zIndex: 10,
                }}
              >
                <Button
                  size="small"
                  variant="text"
                  onClick={() => zoomOut()}
                  aria-label="Reducir"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Typography
                  variant="caption"
                  sx={{ width: 50, textAlign: "center" }}
                >
                  {Math.round((previewScale || 1) * 100)}%
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => zoomIn()}
                  aria-label="Ampliar"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    resetTransform();
                    setPreviewScale(1);
                  }}
                  aria-label="Reset"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </Box>

              {/* Tip */}
              <Box
                sx={{
                  position: "fixed",
                  bottom: 16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  px: 2,
                  py: 0.5,
                  borderRadius: 99,
                  bgcolor: "rgba(255,255,255,0.1)",
                  color: "white",
                  fontSize: 11,
                  backdropFilter: "blur(6px)",
                }}
              >
                Rueda para hacer zoom • Arrastra para mover • Doble clic para
                ampliar
              </Box>

              {/* Cerrar */}
              <IconButton
                onClick={onClose}
                sx={{
                  position: "fixed",
                  top: 16,
                  right: 16,
                  bgcolor: "rgba(255,255,255,0.9)",
                  "&:hover": { bgcolor: "white" },
                }}
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </IconButton>

              {/* Lienzo */}
              <Box
                sx={{
                  width: "100%",
                  height: "100%",
                  cursor: "grab",
                  "&:active": { cursor: "grabbing" },
                }}
              >
                <TransformComponent
                  wrapperStyle={{ width: "100%", height: "100%" }}
                  contentStyle={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <Image
                      src={src}
                      alt={alt ?? "preview"}
                      fill
                      sizes="100vw"
                      style={{
                        objectFit: "contain",
                        imageRendering: "auto",
                      }}
                      priority
                    />
                  </Box>
                </TransformComponent>
              </Box>
            </>
          )}
        </TransformWrapper>
      </Box>
    </Dialog>
  );
}
