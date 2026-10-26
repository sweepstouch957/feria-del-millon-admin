"use client";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Button,
  LinearProgress,
  TextField,
  InputAdornment,
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
  UploadCloud as UploadCloudIcon,
  PencilLine as ReturnIcon,
  X as ClearIcon,
} from "lucide-react";
import { patchArtwork } from "@services/artworks.service";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useArtworksCursor } from "@/hooks/useArtworksCursor";
import { useTechniques } from "@/hooks/useTechniques";
import { listPavilions, type PavilionDoc } from "@services/pavilions.service";
import { setCatalogReveal, setInventoryClose, setInventoryExtension, type InventoryExtension } from "@services/events.service";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { formatCOP } from "@/utils/money";
import ResponsiveRows from "@/components/common/ResponsiveRows";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import PublishArtworksDialog from "@components/views/events/PublishArtworksDialog";

/* Obras de la feria activa. Una sola fila de filtros (buscar, pabellón,
   artista, técnica, estado) y "Publicar" publica LO QUE ESTÁ FILTRADO: antes
   había que elegir el pabellón en el filtro y otra vez dentro del diálogo. */

const formatPrice = (price?: number, currency = "COP") =>
  price == null ? "—" : formatCOP(price, { code: true, currency });

type StatusFilter = "" | "hidden" | "published";

export default function ArtworksPage() {
  const { event: activeEvent, eventId, isLoading, isError, refetch } = useActiveEvent();
  if (!eventId) return <ActiveEventGate isLoading={isLoading} isError={isError} onRetry={refetch} />;
  return <ArtworksCursorPage eventId={eventId} activeEvent={activeEvent} refetchEvent={refetch} />;
}

function ArtworksCursorPage({ eventId, activeEvent, refetchEvent }: { eventId: string; activeEvent: any; refetchEvent: () => unknown }) {
  const event = eventId;
  const [q, setQ] = useState("");
  const [pavilion, setPavilion] = useState<string>("");
  const [artist, setArtist] = useState<string>("");
  const [technique, setTechnique] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [publishOpen, setPublishOpen] = useState(false);

  // Pabellones con sus artistas: de aquí salen los dos selectores (y el
  // artista queda acotado al pabellón elegido).
  const pavilionsQuery = useQuery({
    queryKey: ["pavilions", eventId, "with-artists"],
    queryFn: () => listPavilions(eventId, true),
    staleTime: 60_000,
  });
  const pavilions = (pavilionsQuery.data ?? []) as PavilionDoc[];
  const techniquesQuery = useTechniques();

  const artistOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pavilions) {
      if (pavilion && String(p.id) !== pavilion) continue;
      for (const a of (p as any).artistInfo ?? []) {
        map.set(String(a.id), `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() || a.email);
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [pavilions, pavilion]);

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
  } = useArtworksCursor({ q, event, pavilion, artist, technique, limit: 24, includeHidden: 1 });

  // ponytail: el estado se filtra en cliente sobre lo cargado; al backend si hay miles de obras.
  const shown = useMemo(
    () =>
      status === ""
        ? rows
        : rows.filter((a: any) => (status === "hidden" ? !!a.hiddenUntilEvent : !a.hiddenUntilEvent && a.status === "published")),
    [rows, status]
  );

  const selectedEvent: any = activeEvent;
  const [revealBusy, setRevealBusy] = useState(false);
  const toggleReveal = async (checked: boolean) => {
    setRevealBusy(true);
    try {
      await setCatalogReveal(event, checked);
      await refetchEvent();
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
    setRevealBusy(true);
    try {
      await setInventoryClose(event, value ? new Date(value).toISOString() : null);
      await refetchEvent();
    } finally {
      setRevealBusy(false);
    }
  };

  // Plazo extendido: estos artistas siguen cargando obras después del cierre.
  const allArtists = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pavilions)
      for (const a of (p as any).artistInfo ?? []) map.set(String(a.id), `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() || a.email);
    return map;
  }, [pavilions]);
  const extensions = (selectedEvent?.inventoryExtensions ?? []) as InventoryExtension[];
  const [extArtist, setExtArtist] = useState("");
  const [extUntil, setExtUntil] = useState("");
  const saveExtension = async (artistId: string, until: string | null) => {
    setRevealBusy(true);
    try {
      await setInventoryExtension(event, artistId, until);
      await refetchEvent();
      setExtArtist("");
    } catch (e: any) {
      window.alert(e?.response?.data?.error || "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setRevealBusy(false);
    }
  };

  // Devolver una obra al artista: puede editarla UNA vez aunque la carga haya
  // cerrado (p. ej. subió una serie con stock 1). Al guardar él, se vuelve a cerrar.
  // ponytail: window.prompt para la nota; diálogo propio si hace falta más que un texto.
  const [returningId, setReturningId] = useState<string | null>(null);
  const toggleReturn = async (art: any) => {
    const unlock = !art.editUnlocked;
    let editNote = "";
    if (unlock) {
      const note = window.prompt(
        `Devolver “${art.title}” al artista para que la corrija.\n¿Qué tiene que revisar? (opcional)`,
        "Revisa el número de reproducciones (stock)."
      );
      if (note === null) return; // canceló
      editNote = note.trim();
    }
    setReturningId(String(art.id));
    try {
      await patchArtwork(String(art.id), { editUnlocked: unlock, editNote });
      await refetch();
    } catch (e: any) {
      window.alert(e?.response?.data?.error || "No se pudo cambiar. Intenta de nuevo.");
    } finally {
      setReturningId(null);
    }
  };

  const hiddenCount = rows.filter((r: any) => r.hiddenUntilEvent).length;
  const totalArtists = new Set(rows.map((r: any) => r.artistInfo?._id).filter(Boolean)).size;
  const hasFilter = !!(q || pavilion || artist || technique || status);
  const clearFilters = () => { setQ(""); setPavilion(""); setArtist(""); setTechnique(""); setStatus(""); };

  // Lo que se va a publicar es lo mismo que se está viendo.
  const publishScope = artist
    ? { scope: "artist" as const, artist }
    : pavilion
      ? { scope: "pavilion" as const, pavilion }
      : { scope: "all" as const };
  const scopeLabel = artist
    ? `las de ${artistOptions.find(([id]) => id === artist)?.[1] ?? "este artista"}`
    : pavilion
      ? `las de ${pavilions.find((p) => String(p.id) === pavilion)?.name ?? "este pabellón"}`
      : "todas las de la feria";

  return (
    <Box>
      <PageHeader
        crumb="Inventario"
        title="Obras"
        description={`${selectedEvent?.name ?? "Feria"} · lo que suben los artistas queda cargado pero oculto; publicar es decidir qué sale al catálogo.`}
        actions={[
          { label: `Publicar ${scopeLabel}`, kind: "pri", icon: <UploadCloudIcon size={14} />, onClick: () => setPublishOpen(true) },
          { label: "Estado de carga", kind: "sec", href: "/inventory/carga" },
          { label: "Actualizar", kind: "sec", icon: <RefreshIcon size={14} />, disabled: isFetching, onClick: () => refetch() },
        ]}
      />

      <KpiStrip
        loading={isLoading}
        items={[
          { label: "Obras cargadas", value: totalLabel },
          { label: "Sin publicar (de las cargadas aquí)", value: hiddenCount },
          { label: "Artistas", value: totalArtists },
          { label: "Pabellones", value: pavilions.length },
        ]}
      />

      {/* Ajustes de la feria que afectan a todas las obras */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
            <Tooltip title="Al activarlo, las obras marcadas “ocultas hasta el evento” se muestran en el catálogo público ya mismo.">
              <FormControlLabel
                sx={{ mr: 0 }}
                control={
                  <Switch
                    color="success"
                    checked={!!selectedEvent?.catalogRevealed}
                    disabled={revealBusy}
                    onChange={(e) => toggleReveal(e.target.checked)}
                  />
                }
                label={<Typography variant="body2" fontWeight={500}>Catálogo revelado al público</Typography>}
              />
            </Tooltip>
            <Tooltip title="Después de esta fecha los artistas ya no pueden crear ni editar obras. Vacío = sin cierre.">
              <TextField
                key={selectedEvent?.inventoryCloseAt || "none"}
                size="small"
                type="datetime-local"
                label="Cierre de carga para artistas"
                InputLabelProps={{ shrink: true }}
                defaultValue={toLocalInput(selectedEvent?.inventoryCloseAt)}
                disabled={revealBusy}
                onBlur={(e) => {
                  if (e.target.value !== toLocalInput(selectedEvent?.inventoryCloseAt))
                    saveInventoryClose(e.target.value);
                }}
                sx={{ minWidth: 260 }}
              />
            </Tooltip>
          </Stack>

          {/* Excepciones al cierre: artistas que siguen cargando hasta su fecha. */}
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
              Plazo extendido para artistas
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                pueden crear y editar obras hasta su fecha, aunque la carga haya cerrado
              </Typography>
            </Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} flexWrap="wrap" useFlexGap>
              <TextField select size="small" label="Artista" value={extArtist} onChange={(e) => setExtArtist(e.target.value)} sx={{ minWidth: 240 }}>
                {[...allArtists.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => (
                  <MenuItem key={id} value={id}>{name}</MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                type="datetime-local"
                label="Hasta"
                InputLabelProps={{ shrink: true }}
                value={extUntil}
                onChange={(e) => setExtUntil(e.target.value)}
                sx={{ minWidth: 220 }}
              />
              <Button
                variant="contained"
                size="small"
                disabled={revealBusy || !extArtist || !extUntil}
                onClick={() => saveExtension(extArtist, new Date(extUntil).toISOString())}
              >
                Dar plazo
              </Button>
              {extensions.map((x) => {
                const past = new Date(x.until).getTime() < Date.now();
                return (
                  <Chip
                    key={x.artist}
                    size="small"
                    color={past ? "default" : "success"}
                    variant={past ? "outlined" : "filled"}
                    label={`${allArtists.get(String(x.artist)) ?? "Artista"} · hasta ${new Date(x.until).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}${past ? " (vencido)" : ""}`}
                    onDelete={revealBusy ? undefined : () => saveExtension(String(x.artist), null)}
                  />
                );
              })}
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Obras: una sola fila de filtros */}
      <Card sx={{ overflow: "hidden" }}>
        <CardContent sx={{ pb: 1 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }} flexWrap="wrap" useFlexGap>
            <TextField
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por título"
              size="small"
              sx={{ flex: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon size={16} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField select size="small" label="Pabellón" value={pavilion} onChange={(e) => { setPavilion(e.target.value); setArtist(""); }} sx={{ minWidth: 180 }}>
              <MenuItem value=""><em>Todos</em></MenuItem>
              {pavilions.map((pav) => (
                <MenuItem key={pav.id} value={pav.id}>{pav.name}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="Artista" value={artist} onChange={(e) => setArtist(e.target.value)} sx={{ minWidth: 200 }}>
              <MenuItem value=""><em>Todos</em></MenuItem>
              {artistOptions.map(([id, name]) => (
                <MenuItem key={id} value={id}>{name}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="Técnica" value={technique} onChange={(e) => setTechnique(e.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value=""><em>Todas</em></MenuItem>
              {(techniquesQuery.data ?? []).map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="Estado" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} sx={{ minWidth: 150 }}>
              <MenuItem value=""><em>Todas</em></MenuItem>
              <MenuItem value="hidden">Sin publicar</MenuItem>
              <MenuItem value="published">En el catálogo</MenuItem>
            </TextField>
            {hasFilter && (
              <Button size="small" color="inherit" startIcon={<ClearIcon size={14} />} onClick={clearFilters} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
                Limpiar
              </Button>
            )}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
            <Chip size="small" label={`${shown.length} de ${totalLabel} cargadas`} />
            {hasFilter && <Typography variant="caption" color="text.secondary">“Publicar” aplica a {scopeLabel}.</Typography>}
          </Stack>
        </CardContent>

        {(isLoading || isFetching) && <LinearProgress />}

        {/* Tabla */}
        <ResponsiveRows
          loading={isLoading}
          emptyText="No hay obras que coincidan con los filtros."
          cards={shown.map((art: any) => ({
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
                shown.map((art:any) => (
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
                      {art.editUnlocked && (
                        <Chip size="small" color="warning" label="En edición" sx={{ ml: 0.5 }} />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip
                        title={
                          art.editUnlocked
                            ? `Devuelta al artista${art.editNote ? `: ${art.editNote}` : ""}. Clic para cancelar.`
                            : "Devolver al artista para que la edite (aunque la carga esté cerrada)"
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            color={art.editUnlocked ? "warning" : "default"}
                            disabled={returningId === String(art.id)}
                            onClick={() => toggleReturn(art)}
                          >
                            <ReturnIcon size={18} />
                          </IconButton>
                        </span>
                      </Tooltip>
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

              {shown.length > 0 && (
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
        initial={publishScope}
        onDone={() => refetch()}
      />
    </Box>
  );
}
