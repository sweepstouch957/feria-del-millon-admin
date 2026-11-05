"use client";

import { useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  ButtonBase,
  IconButton,
  InputBase,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Search, X } from "lucide-react";
import { FDM } from "@/app/theme";
import type { ArtworkFinder } from "../hooks/useArtworkFinder";
import { pavilionId } from "../hooks/useCashierPavilions";
import { artworkId, type CajaArtwork } from "../model/artwork";
import { ArtworkCard } from "./ArtworkCard";
import { ScanDialog } from "./ScanDialog";

/** Ícono QR del diseño: esquinas de enfoque + tres cuadros + patrón. */
const QrIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
    <rect x="7" y="7" width="4" height="4" fill="currentColor" stroke="none" />
    <rect x="13" y="7" width="4" height="4" fill="currentColor" stroke="none" />
    <rect x="7" y="13" width="4" height="4" fill="currentColor" stroke="none" />
    <path d="M13 13h2v2h-2zM15 15h2v2h-2zM13 17h2M17 13v2" strokeWidth={1.6} />
  </svg>
);

/** Botón negro (blanco en oscuro) que se pone verde al pasar el mouse. */
const invSx = (t: any) => ({
  bgcolor: t.palette.mode === "dark" ? "#F5F4EF" : "#0B0B0A",
  color: t.palette.mode === "dark" ? "#0B0B0A" : "#F5F4EF",
  transition: "background-color .2s ease, color .2s ease",
  "&:hover": { bgcolor: FDM.green, color: "#0B0B0A" },
});

const filterSx = {
  "& .MuiOutlinedInput-root": { borderRadius: "12px", minHeight: 46, bgcolor: "background.default" },
  "& .MuiInputLabel-root": { fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase" },
} as const;

/**
 * Buscar la obra: escribir (título, código de etiqueta), escanear el QR con la
 * cámara o con un lector USB (escribe el texto y manda Enter), o filtrar por
 * pabellón, técnica y artista. Sin búsqueda no se carga ninguna obra.
 */
export function ArtworkFinderPanel({
  finder,
  selectedId,
  onPick,
}: {
  finder: ArtworkFinder;
  selectedId?: string;
  onPick: (a: CajaArtwork) => void;
}) {
  const [scanOpen, setScanOpen] = useState(false);

  const resolveAndPick = async (raw: string) => {
    const art = await finder.resolve(raw);
    if (art) onPick(art);
  };

  const hasFilters = !!(finder.text || finder.technique || finder.artist || (!finder.pavilionLocked && finder.pavilion));

  return (
    <Stack spacing={2}>
      <Box
        sx={(t) => ({
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: { xs: "16px", sm: "20px" },
          p: { xs: 1.5, sm: 2 },
          display: "flex",
          flexDirection: "column",
          gap: 1.75,
          boxShadow: t.palette.mode === "dark" ? "none" : "0 1px 0 rgba(21,21,15,.04), 0 12px 32px -20px rgba(11,11,10,.25)",
        })}
      >
        <Box
          sx={(t) => ({
            display: "flex",
            alignItems: "center",
            gap: { xs: 0.75, sm: 1.25 },
            height: { xs: 52, sm: 56 },
            pl: { xs: 1.5, sm: 2 },
            pr: 0.75,
            borderRadius: "14px",
            border: "1.5px solid",
            borderColor: t.palette.divider,
            bgcolor: "background.default",
            transition: "border-color .2s ease",
            "&:focus-within": { borderColor: FDM.green },
          })}
        >
          <Search size={18} style={{ flex: "none", opacity: 0.7 }} />
          <InputBase
            autoFocus
            value={finder.text}
            onChange={(e) => finder.setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && finder.text.trim()) {
                e.preventDefault();
                void resolveAndPick(finder.text);
              }
            }}
            placeholder="Título, código de etiqueta o QR"
            inputProps={{ "aria-label": "Buscar obra por título, código de etiqueta o QR", enterKeyHint: "search" }}
            sx={{ flex: 1, minWidth: 0, fontSize: { xs: 16, sm: 17 } }}
          />
          {finder.text && (
            <IconButton aria-label="Borrar búsqueda" onClick={() => finder.setText("")} sx={{ width: 44, height: 44 }}>
              <X size={18} />
            </IconButton>
          )}
          <ButtonBase
            onClick={() => setScanOpen(true)}
            aria-label="Escanear QR"
            sx={(t) => ({ ...invSx(t), flex: "none", height: 44, minWidth: 44, px: { xs: 1.25, sm: 2 }, borderRadius: "10px", gap: 1, fontSize: 14, fontWeight: 500 })}
          >
            <QrIcon />
            {/* Celular: solo el ícono, así el campo de búsqueda no queda de 3 letras. */}
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Escanear</Box>
          </ButtonBase>
        </Box>

        <LinearProgress
          aria-label="Buscando obras"
          aria-hidden={!finder.isSearching}
          sx={{ height: 2, mt: "-12px !important", borderRadius: 1, visibility: finder.isSearching ? "visible" : "hidden" }}
        />

        {/* Celular: pabellón y técnica lado a lado, artista abajo a todo el ancho. */}
        <Box
          sx={{
            display: "grid",
            gap: 1.25,
            mt: "-6px",
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(auto-fit, minmax(180px, 1fr))" },
            "& > :nth-of-type(3)": { gridColumn: { xs: "1 / -1", sm: "auto" } },
          }}
        >
          <TextField
            select
            size="small"
            label="Pabellón"
            value={finder.pavilion}
            onChange={(e) => finder.setPavilion(e.target.value)}
            disabled={finder.pavilionLocked && finder.pavilionOptions.length <= 1}
            sx={filterSx}
          >
            {!finder.pavilionLocked && <MenuItem value="">Todos</MenuItem>}
            {finder.pavilionOptions.map((p) => (
              <MenuItem key={pavilionId(p)} value={pavilionId(p)}>{p.name}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Técnica" value={finder.technique} onChange={(e) => finder.setTechnique(e.target.value)} sx={filterSx}>
            <MenuItem value="">Todas</MenuItem>
            {finder.techniqueOptions.map((t: any) => (
              <MenuItem key={t._id ?? t.id} value={String(t._id ?? t.id)}>{t.name}</MenuItem>
            ))}
          </TextField>
          <Autocomplete
            size="small"
            options={finder.artistOptions}
            value={finder.artist}
            onChange={(_, v) => finder.setArtist(v)}
            onInputChange={(_, v, reason) => reason === "input" && finder.setArtistQ(v)}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            filterOptions={(x) => x}
            noOptionsText="Escribe el nombre del artista"
            renderInput={(params) => <TextField {...params} label="Artista" placeholder="Buscar artista" sx={filterSx} />}
          />
        </Box>
      </Box>

      {!finder.searching ? (
        // Estado inicial: no se carga ninguna obra hasta que escaneen o escriban.
        <Box sx={{ border: "1.5px dashed", borderColor: "divider", borderRadius: { xs: "16px", sm: "20px" }, py: { xs: 3.5, sm: 7 }, px: { xs: 2, sm: 3 }, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ color: FDM.green }}><QrIcon size={40} /></Box>
          <Typography sx={{ fontSize: { xs: 17, sm: 20 }, fontWeight: 600, letterSpacing: "-.01em" }}>Escanea el QR de la etiqueta</Typography>
          <Typography sx={{ color: "text.secondary", fontSize: { xs: 14, sm: 15 }, maxWidth: 380 }}>
            o escribe el título o el código de la obra arriba.
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}> La lista sale cuando buscas: así la caja carga rápido aunque el internet esté lento.</Box>
          </Typography>
          <ButtonBase
            onClick={() => setScanOpen(true)}
            sx={(t) => ({ ...invSx(t), mt: 1, height: 52, px: 3.5, borderRadius: 999, gap: 1.25, fontSize: 15, fontWeight: 600, width: { xs: "100%", sm: "auto" } })}
          >
            <QrIcon size={20} />
            Escanear QR
          </ButtonBase>
        </Box>
      ) : (
        <>
          <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1.5 }}>
            <Typography role="status" aria-live="polite" sx={{ fontSize: 13, color: "text.secondary" }}>
              {finder.isLoading ? "Buscando obras…" : (
                <>
                  <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>{finder.rows.length}{finder.hasNextPage ? "+" : ""}</Box>{" "}
                  {finder.rows.length === 1 ? "obra" : "obras"}
                </>
              )}
            </Typography>
            {hasFilters && (
              <Button size="small" onClick={finder.clearFilters} startIcon={<X size={14} />}>Limpiar</Button>
            )}
          </Box>

          {/* Celular: dos tarjetas por fila (una sola quedaba enorme y obligaba a bajar mucho). */}
          <Box sx={{ display: "grid", gap: { xs: "10px", sm: "14px" }, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(auto-fill, minmax(min(220px, 100%), 1fr))" } }}>
            {finder.rows.map((a) => (
              <ArtworkCard key={artworkId(a)} artwork={a} selected={artworkId(a) === selectedId} onPick={onPick} />
            ))}
          </Box>

          {!finder.isLoading && finder.rows.length === 0 && (
            <Typography color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
              No hay obras con esa búsqueda. Prueba con el código completo de la etiqueta o escanea el QR.
            </Typography>
          )}
          {finder.hasNextPage && (
            <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
              <Button
                variant="outlined"
                onClick={() => finder.loadMore()}
                disabled={finder.isFetchingNextPage}
                sx={{ height: 48, px: 3.5, borderRadius: 999, fontSize: 15 }}
              >
                {finder.isFetchingNextPage ? "Cargando…" : "Ver más obras"}
              </Button>
            </Box>
          )}
        </>
      )}

      <ScanDialog
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={(text) => {
          setScanOpen(false);
          void resolveAndPick(text);
        }}
      />
    </Stack>
  );
}
