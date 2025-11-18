"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Chip,
} from "@mui/material";
import { Loader2, Plus, Filter } from "lucide-react";
import { toast } from "sonner";

import { useTechniques } from "@hooks/useTechniques";
import { usePavilionsByUser } from "@hooks/usePavilionsByUser";
import {
  useArtworksCursor,
  type ArtworkRow,
} from "@hooks/useArtworksCursor";
import { useArtworkDetail } from "@hooks/useArtworkDetail";

import ArtworksTable from "./ArtworksTable";
import ArtworkDetailModal from "./ArtworkDetailModal";
import CreateEditArtworkModal from "./CreateEditArtworkModal";
import QRModal from "./QrModal";
import { useAuth } from "@/provider/authProvider";
import { DEFAULT_EVENT_ID, FIXED_PAVILION_ID } from "@/core/constants";

export default function MiEstudioClient() {
  const { user, isAuthLoading, isAuthenticated } = useAuth();
  const artistId = user?.id || (user as any)?._id;

  const [q, setQ] = useState("");
  const [tech, setTech] = useState<string | "all">("all");
  const [pavilion, setPavilion] = useState<string | "all">(FIXED_PAVILION_ID);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [qrForId, setQrForId] = useState<string | null>(null);

  const { data: techniques = [] } = useTechniques();
  const { data: pavsByUser } = usePavilionsByUser(
    DEFAULT_EVENT_ID,
    artistId as string,
    true
  );

  const filters = useMemo(
    () => ({
      q: q || undefined,
      event: DEFAULT_EVENT_ID,
      pavilion: pavilion === "all" ? undefined : pavilion,
      technique: tech === "all" ? undefined : tech,
      limit: 24,
      artist: artistId,
    }),
    [q, pavilion, tech, artistId]
  );

  const artworksQuery = useArtworksCursor(filters as any);
  const rows = (artworksQuery.rows ?? []) as ArtworkRow[];

  const { data: detailData, isFetching: loadingDetail } = useArtworkDetail(
    detailId ?? undefined
  );

  const pavilionOptions = useMemo(
    () =>
      (pavsByUser?.rows ?? []).map((p) => ({
        value: String(p.pavilionId),
        label: p.name || p.slug || "Pabellón",
      })),
    [pavsByUser]
  );

  const techniqueOptions = useMemo(
    () =>
      (techniques ?? []).map((t: any) => ({
        value: t.id || t._id,
        label: t.name,
      })),
    [techniques]
  );

  if (isAuthLoading) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          color: "text.secondary",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Loader2 className="w-5 h-5 mr-1 animate-spin" />
          Cargando sesión…
        </Box>
      </Box>
    );
  }

  if (!isAuthenticated || !artistId) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          color: "text.secondary",
        }}
      >
        Debes iniciar sesión para acceder a tu estudio.
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #f9fafb, #ffffff)",
      }}
    >
      <Box
        sx={{
          maxWidth: "1120px",
          mx: "auto",
          px: { xs: 2, sm: 3, lg: 4 },
          py: 4,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 900, letterSpacing: "-0.03em" }}
            >
              Mi estudio de artista
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Crea, edita, comparte y administra tus obras
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="medium"
            onClick={() => {
              setEditingId(null);
              setModalOpen(true);
            }}
            startIcon={<Plus className="w-4 h-4" />}
          >
            Nueva obra
          </Button>
        </Box>

        {/* Filtros */}
        <Box
          sx={{
            position: "sticky",
            top: 16,
            zIndex: 10,
          }}
        >
          <Paper
            elevation={1}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: "grey.100",
              p: 2.5,
              backdropFilter: "blur(8px)",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "1.8fr 1.2fr",
                  md: "2fr 1fr 1fr auto",
                },
                gap: 2,
                alignItems: "center",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Filter className="w-4 h-4" />
                <TextField
                  size="small"
                  fullWidth
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por título o descripción…"
                />
              </Box>

              <TextField
                select
                SelectProps={{ native: true }}
                size="small"
                label="Pabellón"
                value={pavilion}
                onChange={(e) =>
                  setPavilion(e.target.value as "all" | string)
                }
              >
                <option value="all">Todos los pabellones</option>
                {pavilionOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </TextField>

              <TextField
                select
                SelectProps={{ native: true }}
                size="small"
                label="Técnica"
                value={tech}
                onChange={(e) => setTech(e.target.value as "all" | string)}
              >
                <option value="all">Todas las técnicas</option>
                {techniqueOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </TextField>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  justifyContent: "flex-end",
                }}
              >
                <Chip
                  size="small"
                  label={artworksQuery.totalLabel || "0 obras"}
                  sx={{ bgcolor: "grey.100" }}
                />
                {artworksQuery.isFetching && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Tabla */}
        <ArtworksTable
          rows={rows}
          loading={artworksQuery.isLoading}
          onView={(id) => setDetailId(id)}
          onEdit={(id) => {
            setEditingId(id);
            setModalOpen(true);
          }}
          onOpenQr={(id) => setQrForId(id)}
          onShare={(msg) => toast.success(msg)}
          onLoadMore={() => artworksQuery.loadMore()}
          hasMore={!!artworksQuery.hasNextPage}
          loadingMore={!!artworksQuery.isFetchingNextPage}
        />
      </Box>

      {/* Modal detalle */}
      <ArtworkDetailModal
        id={detailId}
        data={detailData}
        open={!!detailId}
        loading={loadingDetail}
        onClose={() => setDetailId(null)}
        onOpenQr={(id) => setQrForId(id)}
      />

      {/* Modal crear/editar */}
      <CreateEditArtworkModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        eventId={DEFAULT_EVENT_ID}
        editingId={editingId}
        currentRows={rows}
        techniqueOptions={techniqueOptions}
        pavilionOptions={pavilionOptions}
        artistId={artistId as string}
        onDone={() => {
          setEditingId(null);
          setModalOpen(false);
        }}
      />

      {/* Modal QR */}
      <QRModal
        artworkId={qrForId}
        open={!!qrForId}
        onClose={() => setQrForId(null)}
      />
    </Box>
  );
}
