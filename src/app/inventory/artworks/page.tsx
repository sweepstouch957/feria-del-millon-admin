"use client";

import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Stack,
  Chip,
  Button,
  Divider,
  LinearProgress,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Avatar,
  IconButton,
  Tooltip,
  Paper,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Search as SearchIcon,
  RefreshCw as RefreshIcon,
  Eye as EyeIcon,
  GalleryHorizontal as GalleryIcon,
  ChevronDown as ChevronDownIcon,
  Building2 as PavilionIcon,
  CalendarDays as EventIcon,
  Users as ArtistsIcon,
  Brush as ArtworksIcon,
  UploadCloud as UploadCloudIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useArtworksCursor } from "@/hooks/useArtworksCursor";
import { useTechniques } from "@/hooks/useTechniques";
import { useEvents } from "@/hooks/useEvents";
import { usePavilions } from "@/hooks/usePavilions";
import { setCatalogReveal, setInventoryClose } from "@services/events.service";
import { formatCOP } from "@/utils/money";
import ResponsiveRows from "@/components/common/ResponsiveRows";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import PublishArtworksDialog from "@components/views/events/PublishArtworksDialog";

const formatPrice = (price?: number, currency = "COP") =>
  price == null ? "—" : formatCOP(price, { code: true, currency });

export default function ArtworksCursorPage() {
  const [q, setQ] = useState("");
  const [event, setEvent] = useState<string>("");
  const [pavilion, setPavilion] = useState<string>("");
  const [technique, setTechnique] = useState<string>("");
  const [publishOpen, setPublishOpen] = useState(false);

  const eventsQuery = useEvents();
  const pavilionsQuery = usePavilions(event);
  const techniquesQuery = useTechniques();

  const {
    rows,
    totalLabel,
    isLoading,
    isFetching,
    isError,
    error,
    hasNextPage,
    loadMore,
    isFetchingNextPage,
    refetch,
  } = useArtworksCursor({ q, event, pavilion, technique, limit: 24, includeHidden: 1 });

  // Interruptor global: revelar el catálogo (muestra las obras "ocultas hasta el evento").
  const selectedEvent: any = (eventsQuery.data ?? []).find(
    (ev: any) => (ev.id || ev._id) === event
  );
  const [revealBusy, setRevealBusy] = useState(false);
  const toggleReveal = async (checked: boolean) => {
    if (!event) return;
    setRevealBusy(true);
    try {
      await setCatalogReveal(event, checked);
      await eventsQuery.refetch?.();
    } finally {
      setRevealBusy(false);
    }
  };

  // Cierre de carga de obras para artistas. datetime-local trabaja en hora local.
  const toLocalInput = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const saveInventoryClose = async (value: string) => {
    if (!event) return;
    setRevealBusy(true);
    try {
      await setInventoryClose(event, value ? new Date(value).toISOString() : null);
      await eventsQuery.refetch?.();
    } finally {
      setRevealBusy(false);
    }
  };

  const totalArtworks = totalLabel;
  const totalArtists = new Set(
    rows.map((r:any) => r.artistInfo?._id).filter(Boolean)
  ).size;
  const totalEvents = eventsQuery.data?.length ?? 0;
  const totalPavilions = pavilionsQuery.data?.length ?? 0;

  return (
    <Box>
      <PageHeader
        crumb="Inventario"
        title="Artes"
        description="Obras cargadas por los artistas y publicadas en el catálogo público."
      />

      <KpiStrip
        items={[
          { label: "Obras publicadas", value: totalArtworks },
          { label: "Artistas en catálogo", value: totalArtists },
          { label: "Ferias", value: totalEvents },
          { label: "Pabellones", value: totalPavilions },
        ]}
      />

      {/* Tabla de obras */}
      <Card sx={{ overflow: "hidden" }}>
        <CardHeader
          title={
            <Stack direction="row" flexWrap="wrap" alignItems="center" spacing={1}>
              <Typography variant="h5" fontWeight={500}>
                Obras
              </Typography>
              <Chip label={`${totalLabel} cargadas`} size="small" />
            </Stack>
          }
          action={
            <Stack direction="row" flexWrap="wrap" spacing={1.5} alignItems="center">
              {selectedEvent && (
                <Tooltip title="Al activarlo, las obras marcadas “ocultas hasta el evento” se muestran en el catálogo público ya mismo.">
                  <FormControlLabel
                    sx={{ mr: 0 }}
                    control={
                      <Switch
                        color="success"
                        checked={!!selectedEvent.catalogRevealed}
                        disabled={revealBusy}
                        onChange={(e) => toggleReveal(e.target.checked)}
                      />
                    }
                    label={<Typography variant="caption" fontWeight={500}>Catálogo revelado</Typography>}
                  />
                </Tooltip>
              )}
              {selectedEvent && (
                <Tooltip title="Después de esta fecha los artistas ya no pueden crear ni editar obras. Vacío = sin cierre.">
                  <TextField
                    key={selectedEvent.inventoryCloseAt || "none"}
                    size="small"
                    type="datetime-local"
                    label="Cierre de inventario"
                    InputLabelProps={{ shrink: true }}
                    defaultValue={toLocalInput(selectedEvent.inventoryCloseAt)}
                    disabled={revealBusy}
                    onBlur={(e) => {
                      if (e.target.value !== toLocalInput(selectedEvent.inventoryCloseAt))
                        saveInventoryClose(e.target.value);
                    }}
                  />
                </Tooltip>
              )}
              {selectedEvent && (
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<UploadCloudIcon size={16} />}
                  onClick={() => setPublishOpen(true)}
                >
                  Publicar obras
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<RefreshIcon size={16} />}
                onClick={() => refetch()}
                disabled={isFetching}
              >
                Actualizar
              </Button>
            </Stack>
          }
          sx={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.0) 100%)",
          }}
        />

        <Divider />

        {/* Filtros */}
        <CardContent sx={{ pb: 1 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <TextField
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por título o texto"
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon size={16} />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Evento</InputLabel>
              <Select
                value={event}
                onChange={(e) => {
                  setEvent(e.target.value);
                  setPavilion("");
                }}
                IconComponent={ChevronDownIcon as any}
              >
                <MenuItem value="">
                  <em>Todos</em>
                </MenuItem>
                {(eventsQuery.data ?? []).map((ev) => (
                  <MenuItem key={ev.id} value={ev.id}>
                    {ev.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Pabellón</InputLabel>
              <Select
                value={pavilion}
                onChange={(e) => setPavilion(e.target.value)}
                IconComponent={ChevronDownIcon as any}
                disabled={!event}
              >
                <MenuItem value="">
                  <em>Todos</em>
                </MenuItem>
                {(pavilionsQuery.data ?? []).map((pav) => (
                  <MenuItem key={pav.id} value={pav.id}>
                    {pav.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Técnica</InputLabel>
              <Select
                value={technique}
                onChange={(e) => setTechnique(e.target.value)}
                IconComponent={ChevronDownIcon as any}
              >
                <MenuItem value="">
                  <em>Todas</em>
                </MenuItem>
                {(techniquesQuery.data ?? []).map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>

        {(isLoading || isFetching) && <LinearProgress />}

        {/* Tabla */}
        <ResponsiveRows
          loading={isLoading}
          emptyText="No hay obras que coincidan con los filtros."
          cards={rows.map((art: any) => ({
            id: String(art.id),
            title: (
              <Link href={`/inventory/artworks/${art.id}`} style={{ color: "inherit" }}>
                {art.title || "Sin título"}
              </Link>
            ),
            subtitle:
              [art.artistInfo?.firstName, art.artistInfo?.lastName]
                .filter(Boolean)
                .join(" ") || undefined,
            badge: art.hiddenUntilEvent ? (
              <Chip size="small" variant="outlined" color="warning" label="Sin publicar" />
            ) : (
              <Chip
                size="small"
                label={art.status === "published" ? "En el catálogo" : art.status ?? "—"}
                color={art.status === "published" ? "success" : "default"}
              />
            ),
            fields: [
              { label: "Precio", value: formatPrice(art.price) },
              { label: "Stock", value: String(art.stock ?? 0) },
              { label: "Técnica", value: art.techniqueInfo?.name },
              { label: "Pabellón", value: art.pavilionInfo?.name },
            ],
          }))}
        >
        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Imagen</TableCell>
                <TableCell>Título</TableCell>
                <TableCell>Artista</TableCell>
                <TableCell>Técnica</TableCell>
                <TableCell>Pabellón</TableCell>
                <TableCell align="right">Precio</TableCell>
                <TableCell align="center">Stock</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {isError && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography color="error">
                      {(error as any)?.message ?? "Error desconocido"}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                rows.map((art:any) => (
                  <TableRow key={art.id} hover>
                    <TableCell>
                      <Avatar
                        variant="rounded"
                        src={art.image || art.images?.[0]}
                        sx={{ width: 56, height: 56 }}
                      >
                        <GalleryIcon size={18} />
                      </Avatar>
                    </TableCell>

                    <TableCell>
                      <Link
                        href={`/inventory/artworks/${art.id}`}
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        <Typography
                          fontWeight={500}
                          sx={{ "&:hover": { color: "primary.main" } }}
                        >
                          {art.title}
                        </Typography>
                      </Link>
                      <Typography variant="caption" color="text.secondary">
                        {art.slug ?? "—"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {art.artistInfo
                        ? `${art.artistInfo.firstName ?? ""} ${
                            art.artistInfo.lastName ?? ""
                          }`
                        : "—"}
                    </TableCell>

                    <TableCell>{art.techniqueInfo?.name ?? "—"}</TableCell>
                    <TableCell>{art.pavilionInfo?.name ?? "—"}</TableCell>
                    <TableCell align="right">
                      {formatPrice(art.price)}
                    </TableCell>
                    <TableCell align="center">{art.stock ?? 0}</TableCell>
                    <TableCell>
                      {/* Cargada pero fuera del catálogo hasta que se publique:
                          es el estado normal de lo que sube un artista. */}
                      {art.hiddenUntilEvent ? (
                        <Chip size="small" variant="outlined" color="warning" label="Sin publicar" />
                      ) : (
                        <Chip
                          size="small"
                          label={art.status === "published" ? "En el catálogo" : art.status ?? "—"}
                          color={art.status === "published" ? "success" : "default"}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ver público">
                        <IconButton
                          size="small"
                          onClick={() =>
                            window.open(`/inventory/artworks/${art.id}`, "_blank")
                          }
                        >
                          <EyeIcon size={18} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}

              {rows.length > 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    {hasNextPage ? (
                      <Button
                        variant="contained"
                        disabled={isFetchingNextPage}
                        onClick={loadMore}
                      >
                        {isFetchingNextPage ? "Cargando…" : "Cargar más"}
                      </Button>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No hay más resultados.
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        </ResponsiveRows>
      </Card>

      <PublishArtworksDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        eventId={event}
        eventName={selectedEvent?.name}
        onDone={() => refetch()}
      />
    </Box>
  );
}
