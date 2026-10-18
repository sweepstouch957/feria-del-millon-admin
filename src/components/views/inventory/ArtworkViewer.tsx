"use client";

import * as React from "react";
import Link from "next/link";
import {
  Box, Button, Chip, Dialog, IconButton, Stack, Typography, useMediaQuery, Alert,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { ChevronLeft, ChevronRight, ExternalLink, ImageOff, Maximize2, X } from "lucide-react";
import { formatCOP } from "@/utils/money";
import { eyebrow, FDM } from "@/app/theme";
import type { InventoryArtworkDetail } from "@services/applications.service";

/* Visor de obra tipo tienda: miniaturas a la izquierda (pasar el mouse cambia
   la imagen, como en Amazon), la imagen grande con lupa que sigue al cursor y
   la ficha técnica a la derecha. Las flechas (o ← →) pasan a la obra vecina
   del mismo artista, para revisar un inventario entero sin cerrar nada. */

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }) : "—";

const ZOOM = 2.4;

export default function ArtworkViewer({
  artworks,
  index,
  artistName,
  onIndex,
  onClose,
}: {
  artworks: InventoryArtworkDetail[];
  index: number | null;
  artistName: string;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("md"));
  const art = index != null ? artworks[index] : null;
  const gallery = art?.gallery?.length ? art.gallery : art?.image ? [art.image] : [];

  const [active, setActive] = React.useState(0);
  const [zoom, setZoom] = React.useState<{ x: number; y: number } | null>(null);
  React.useEffect(() => { setActive(0); setZoom(null); }, [index]);

  const go = React.useCallback(
    (d: number) => {
      if (index == null || !artworks.length) return;
      onIndex((index + d + artworks.length) % artworks.length);
    },
    [index, artworks.length, onIndex]
  );

  // ← → entre obras; ↑ ↓ entre las fotos de la misma obra.
  React.useEffect(() => {
    if (index == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, gallery.length - 1));
      else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, gallery.length]);

  if (!art) return null;
  const src = gallery[active] || "";

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mobile) return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  const spec: [string, React.ReactNode][] = [
    ["Técnica", art.technique || "—"],
    ["Medidas", art.dimensions || <Box component="span" sx={{ color: "warning.main" }}>Sin medidas</Box>],
    ["Año", art.year || "—"],
    ["Edición", art.reproducible ? `Serie de ${art.stock} copia${art.stock === 1 ? "" : "s"}` : art.stock === 1 ? "Obra única" : `${art.stock} unidades`],
    ["Pabellón", art.pavilion || <Box component="span" sx={{ color: "warning.main" }}>Sin pabellón</Box>],
    ["Código", art.tagId || "Se asigna con el QR"],
    ["Cargada", fmt(art.createdAt)],
    ["Editada", fmt(art.updatedAt)],
  ];

  const navBtn = {
    position: "absolute" as const, top: "50%", transform: "translateY(-50%)", zIndex: 2,
    bgcolor: "rgba(11,11,10,0.55)", color: "#fff", backdropFilter: "blur(6px)",
    "&:hover": { bgcolor: "rgba(11,11,10,0.8)" },
  };

  return (
    <Dialog
      open
      onClose={onClose}
      fullScreen={mobile}
      maxWidth={false}
      PaperProps={{ sx: { width: { md: "min(1180px, 94vw)" }, height: { md: "min(780px, 92vh)" }, overflow: "hidden", bgcolor: "background.default" } }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Barra: posición en el inventario y cierre */}
        <Stack direction="row" alignItems="center" gap={1} sx={{ px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography sx={{ ...eyebrow, color: "text.secondary" }} noWrap>
            {artistName} · obra {index! + 1} de {artworks.length}
          </Typography>
          <Box flex={1} />
          <IconButton size="small" onClick={() => go(-1)} disabled={artworks.length < 2}><ChevronLeft size={18} /></IconButton>
          <IconButton size="small" onClick={() => go(1)} disabled={artworks.length < 2}><ChevronRight size={18} /></IconButton>
          <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
        </Stack>

        <Box
          sx={{
            flex: 1, minHeight: 0, display: "grid", overflow: { xs: "auto", md: "hidden" },
            gridTemplateColumns: { xs: "1fr", md: "76px minmax(0,1fr) 380px" },
            gridTemplateRows: { xs: "auto auto auto", md: "1fr" },
          }}
        >
          {/* Miniaturas */}
          <Stack
            direction={{ xs: "row", md: "column" }}
            gap={1}
            sx={{
              order: { xs: 2, md: 0 }, p: 1.5, overflow: "auto",
              borderRight: { md: "1px solid" }, borderColor: { md: "divider" },
            }}
          >
            {gallery.map((g, i) => (
              <Box
                key={g}
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(i)}
                sx={{
                  width: 56, height: 56, flexShrink: 0, cursor: "pointer", overflow: "hidden", borderRadius: 1,
                  border: "2px solid", borderColor: i === active ? "primary.main" : "transparent",
                  boxShadow: i === active ? `0 0 0 3px ${FDM.green}33` : "none",
                  opacity: i === active ? 1 : 0.7, transition: "all .15s", "&:hover": { opacity: 1 },
                }}
              >
                <Box component="img" src={g} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </Box>
            ))}
            {gallery.length === 1 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", md: "block" }, textAlign: "center", mt: 1 }}>
                1 foto
              </Typography>
            )}
          </Stack>

          {/* Imagen grande con lupa */}
          <Box
            onMouseMove={onMove}
            onMouseLeave={() => setZoom(null)}
            sx={{
              order: { xs: 1, md: 1 }, position: "relative", overflow: "hidden",
              height: { xs: "62vw", md: "100%" }, maxHeight: { xs: 460, md: "none" },
              bgcolor: theme.palette.mode === "dark" ? "#141413" : "#EFEDE7",
              display: "grid", placeItems: "center", cursor: src && !mobile ? "zoom-in" : "default",
            }}
          >
            {src ? (
              <Box
                component="img"
                src={src}
                alt={art.title}
                sx={{
                  maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block", userSelect: "none",
                  transition: zoom ? "none" : "transform .25s ease",
                  transform: zoom ? `scale(${ZOOM})` : "scale(1)",
                  transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "center",
                }}
                draggable={false}
              />
            ) : (
              <Stack alignItems="center" gap={1} sx={{ color: "warning.main" }}>
                <ImageOff size={28} />
                <Typography variant="body2">Esta obra no tiene imagen</Typography>
              </Stack>
            )}
            {artworks.length > 1 && (
              <>
                <IconButton onClick={() => go(-1)} sx={{ ...navBtn, left: 12 }}><ChevronLeft size={20} /></IconButton>
                <IconButton onClick={() => go(1)} sx={{ ...navBtn, right: 12 }}><ChevronRight size={20} /></IconButton>
              </>
            )}
            {src && (
              <IconButton component="a" href={src} target="_blank" size="small"
                sx={{ ...navBtn, top: "auto", bottom: 12, right: 12, transform: "none" }}>
                <Maximize2 size={15} />
              </IconButton>
            )}
            {!mobile && src && !zoom && (
              <Typography variant="caption" sx={{ position: "absolute", bottom: 14, left: 14, color: "text.secondary", bgcolor: "background.paper", px: 1, py: 0.25, borderRadius: 1, opacity: 0.85 }}>
                Pasa el mouse para ampliar
              </Typography>
            )}
          </Box>

          {/* Ficha */}
          <Box sx={{ order: 3, p: { xs: 2, md: 3 }, overflow: { md: "auto" }, borderLeft: { md: "1px solid" }, borderColor: { md: "divider" } }}>
            <Typography sx={{ ...eyebrow, color: "primary.main" }}>{art.technique || "Obra"}</Typography>
            <Typography sx={{ fontSize: 26, lineHeight: 1.15, mt: 0.75, fontWeight: 500 }}>{art.title}</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>{artistName}</Typography>

            <Typography sx={{ fontSize: 28, fontWeight: 600, mt: 2, fontVariantNumeric: "tabular-nums" }}>
              {art.price ? formatCOP(art.price, { currency: art.currency }) : <Box component="span" sx={{ color: "warning.main", fontSize: 18 }}>Sin precio</Box>}
            </Typography>

            <Stack direction="row" flexWrap="wrap" gap={0.75} mt={1.5}>
              <Chip size="small" label={art.reproducible ? `Serie · ${art.stock} copias` : "Obra única"} color={art.reproducible ? "primary" : "default"} variant={art.reproducible ? "filled" : "outlined"} />
              <Chip size="small" variant="outlined" label={art.published ? "En el catálogo" : "Sin publicar"} />
              {art.editUnlocked && <Chip size="small" color="warning" label="Devuelta a edición" />}
            </Stack>

            {art.issues.length > 0 && (
              <Alert severity="warning" variant="outlined" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight={600} mb={0.5}>Por revisar</Typography>
                {art.issues.map((i) => <Typography key={i} variant="body2">· {i}</Typography>)}
              </Alert>
            )}
            {art.editUnlocked && art.editNote && (
              <Alert severity="info" variant="outlined" sx={{ mt: 1.5 }}>Nota al artista: {art.editNote}</Alert>
            )}

            <Box sx={{ mt: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
              {spec.map(([k, v]) => (
                <Stack key={k} direction="row" sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 110, flexShrink: 0 }}>{k}</Typography>
                  <Typography variant="body2" component="div" sx={{ minWidth: 0, wordBreak: "break-word" }}>{v}</Typography>
                </Stack>
              ))}
            </Box>

            {art.description && (
              <Box mt={2.5}>
                <Typography sx={{ ...eyebrow, color: "text.secondary" }}>Sobre la obra</Typography>
                <Typography variant="body2" sx={{ mt: 0.75, lineHeight: 1.65, whiteSpace: "pre-line" }}>{art.description}</Typography>
              </Box>
            )}

            <Stack direction="row" gap={2} alignItems="center" mt={3}>
              {art.qrImage && (
                <Box component="img" src={art.qrImage} alt="QR de la obra" sx={{ width: 76, height: 76, bgcolor: "#fff", p: 0.5, borderRadius: 1 }} />
              )}
              <Stack gap={1} flex={1}>
                <Button component={Link} href={`/inventory/artworks/${art.id}`} target="_blank" variant="contained" startIcon={<ExternalLink size={15} />} sx={{ textTransform: "none" }}>
                  Abrir en Artes
                </Button>
                {src && (
                  <Button component="a" href={src} target="_blank" variant="outlined" size="small" sx={{ textTransform: "none" }}>
                    Ver imagen original
                  </Button>
                )}
              </Stack>
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" mt={2}>
              ← → cambia de obra · ↑ ↓ cambia de foto
            </Typography>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
