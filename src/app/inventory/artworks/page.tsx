/* eslint-disable @typescript-eslint/no-explicit-any */
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
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useArtworksCursor } from "@/hooks/useArtworksCursor";
import { useTechniques } from "@/hooks/useTechniques";
import { useEvents } from "@/hooks/useEvents";
import { usePavilions } from "@/hooks/usePavilions";

const formatPrice = (price?: number, currency = "COP") =>
  price == null
    ? "—"
    : new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(price);

export default function ArtworksCursorPage() {
  const [q, setQ] = useState("");
  const [event, setEvent] = useState<string>("");
  const [pavilion, setPavilion] = useState<string>("");
  const [technique, setTechnique] = useState<string>("");

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
  } = useArtworksCursor({ q, event, pavilion, technique, limit:24 });

  const totalArtworks = totalLabel;
  const totalArtists = new Set(
    rows.map((r:any) => r.artistInfo?._id).filter(Boolean)
  ).size;
  const totalEvents = eventsQuery.data?.length ?? 0;
  const totalPavilions = pavilionsQuery.data?.length ?? 0;

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1450, mx: "auto" }}>
      {/* KPI Cards — stack responsivo sin Grid */}
      <Stack
        direction="row"
        flexWrap="wrap"
        gap={2}
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        {[
          {
            icon: <ArtworksIcon size={20} />,
            color: "primary.main",
            label: "Obras publicadas",
            value: totalArtworks,
          },
          {
            icon: <ArtistsIcon size={20} />,
            color: "success.main",
            label: "Artistas en catálogo",
            value: totalArtists,
          },
          {
            icon: <EventIcon size={20} />,
            color: "info.main",
            label: "Eventos activos",
            value: totalEvents,
          },
          {
            icon: <PavilionIcon size={20} />,
            color: "warning.main",
            label: "Pabellones",
            value: totalPavilions,
          },
        ].map((item) => (
          <Card
            key={item.label}
            sx={{
              flex: "1 1 240px",
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              minWidth: 240,
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1.2,
                    borderRadius: "50%",
                    bgcolor: item.color,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {item.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.label}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Tabla de obras */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h5" fontWeight={800}>
                Obras
              </Typography>
              <Chip label={`${totalLabel} cargadas`} size="small" />
            </Stack>
          }
          action={
            <Button
              variant="outlined"
              startIcon={<RefreshIcon size={16} />}
              onClick={() => refetch()}
              disabled={isFetching}
            >
              Actualizar
            </Button>
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
                          fontWeight={600}
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
                      <Chip
                        size="small"
                        label={art.status ?? "—"}
                        color={
                          art.status === "published" ? "success" : "default"
                        }
                      />
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
      </Card>
    </Box>
  );
}
