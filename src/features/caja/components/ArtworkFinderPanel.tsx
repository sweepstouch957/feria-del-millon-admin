"use client";

import { useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { QrCode, Search, X } from "lucide-react";
import type { ArtworkFinder } from "../hooks/useArtworkFinder";
import { pavilionId } from "../hooks/useCashierPavilions";
import { artworkId, type CajaArtwork } from "../model/artwork";
import { ArtworkCard } from "./ArtworkCard";
import { ScanDialog } from "./ScanDialog";

/**
 * Buscar la obra: escribir (título, código de etiqueta), escanear el QR con la
 * cámara o con un lector USB (escribe el texto y manda Enter), o filtrar por
 * pabellón, técnica y artista.
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
    <Stack spacing={1.5}>
      <TextField
        autoFocus
        fullWidth
        value={finder.text}
        onChange={(e) => finder.setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && finder.text.trim()) {
            e.preventDefault();
            void resolveAndPick(finder.text);
          }
        }}
        placeholder="Título, código de etiqueta o QR"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {finder.text && (
                  <IconButton aria-label="Borrar búsqueda" onClick={() => finder.setText("")} edge="end" sx={{ mr: 0.5 }}>
                    <X size={18} />
                  </IconButton>
                )}
                <Tooltip title="Escanear QR con la cámara">
                  <IconButton aria-label="Escanear QR" onClick={() => setScanOpen(true)} edge="end" color="primary">
                    <QrCode size={22} />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          },
        }}
      />

      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1.3fr" } }}>
        <TextField
          select
          size="small"
          label="Pabellón"
          value={finder.pavilion}
          onChange={(e) => finder.setPavilion(e.target.value)}
          disabled={finder.pavilionLocked && finder.pavilionOptions.length <= 1}
        >
          {!finder.pavilionLocked && <MenuItem value="">Todos</MenuItem>}
          {finder.pavilionOptions.map((p) => (
            <MenuItem key={pavilionId(p)} value={pavilionId(p)}>{p.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Técnica"
          value={finder.technique}
          onChange={(e) => finder.setTechnique(e.target.value)}
        >
          <MenuItem value="">Todas</MenuItem>
          {finder.techniqueOptions.map((t: any) => (
            <MenuItem key={t._id ?? t.id} value={String(t._id ?? t.id)}>{t.name}</MenuItem>
          ))}
        </TextField>
        <Autocomplete
          size="small"
          sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}
          options={finder.artistOptions}
          value={finder.artist}
          onChange={(_, v) => finder.setArtist(v)}
          onInputChange={(_, v, reason) => reason === "input" && finder.setArtistQ(v)}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          filterOptions={(x) => x}
          noOptionsText="Sin artistas"
          renderInput={(params) => <TextField {...params} label="Artista" />}
        />
      </Box>

      {hasFilters && (
        <Button size="small" onClick={finder.clearFilters} sx={{ alignSelf: "flex-start" }} startIcon={<X size={14} />}>
          Limpiar filtros
        </Button>
      )}

      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        {finder.rows.map((a) => (
          <ArtworkCard key={artworkId(a)} artwork={a} selected={artworkId(a) === selectedId} onPick={onPick} />
        ))}
      </Box>

      {finder.isLoading && <Typography color="text.secondary">Buscando obras…</Typography>}
      {!finder.isLoading && finder.rows.length === 0 && (
        <Typography color="text.secondary">
          No hay obras con esa búsqueda. Prueba con el código completo de la etiqueta o escanea el QR.
        </Typography>
      )}
      {finder.hasNextPage && (
        <Button variant="outlined" onClick={() => finder.loadMore()} disabled={finder.isFetchingNextPage}>
          {finder.isFetchingNextPage ? "Cargando…" : "Ver más obras"}
        </Button>
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
