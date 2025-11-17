"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Tabs,
  Tab,
  TextField,
  Typography,
  Paper,
} from "@mui/material";
import { Loader2, Plus, Brush, Receipt, Filter } from "lucide-react";
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
import OrdersPlaceholder from "./OrdersPlaceholder";
import CreateEditArtworkModal from "./CreateEditArtworkModal";
import QRModal from "./QrModal";
import { useAuth } from "@/provider/authProvider";

const DEFAULT_EVENT_ID = "6909aef219f26eec22af4220";

export default function MiEstudioClient() {
  const { user, isAuthLoading, isAuthenticated } = useAuth();
  const artistId = user?.id || (user as any)?._id;

  const [q, setQ] = useState("");
  const [tech, setTech] = useState<string | "all">("all");
  const [pavilion, setPavilion] = useState<string | "all">("all");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [qrForId, setQrForId] = useState<string | null>(null);
  const [tab, setTab] = useState<"artworks" | "orders">("artworks");

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
        }}
      >
        {/* Header */}
        <Box
          sx={{
            mb: 4,
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

        {/* Tabs */}
        <Box sx={{ mb: 3 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "white",
              p: 0.5,
              display: "inline-flex",
              boxShadow: 1,
            }}
          >
            <Tab
              value="artworks"
              icon={<Brush className="w-4 h-4" />}
              iconPosition="start"
              label="Obras"
              sx={{
                textTransform: "none",
                borderRadius: 1.5,
                "&.Mui-selected": {
                  bgcolor: "grey.900",
                  color: "common.white",
                },
              }}
            />
            <Tab
              value="orders"
              icon={<Receipt className="w-4 h-4" />}
              iconPosition="start"
              label="Órdenes"
              sx={{
                textTransform: "none",
                borderRadius: 1.5,
                "&.Mui-selected": {
                  bgcolor: "grey.900",
                  color: "common.white",
                },
              }}
            />
          </Tabs>
        </Box>

        {/* TAB OBRAS */}
        {tab === "artworks" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
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
                  p: 2,
                  backdropFilter: "blur(8px)",
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "1fr 1fr",
                      lg: "2fr 1fr 1fr 1fr",
                    },
                    gap: 2,
                    alignItems: "center",
                  }}
                >
                  <Box sx={{ position: "relative" }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Buscar por título o descripción…"
                      InputProps={{
                        startAdornment: (
                          <Filter className="w-4 h-4 text-gray-400 mr-2" />
                        ),
                      }}
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
                    onChange={(e) =>
                      setTech(e.target.value as "all" | string)
                    }
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
                      justifyContent: {
                        xs: "space-between",
                        sm: "flex-start",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: "grey.100",
                        fontSize: 12,
                      }}
                    >
                      {artworksQuery.totalLabel} obras
                    </Box>
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
        )}

        {/* TAB ÓRDENES */}
        {tab === "orders" && (
          <Box sx={{ mt: 2 }}>
            <OrdersPlaceholder />
          </Box>
        )}
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
