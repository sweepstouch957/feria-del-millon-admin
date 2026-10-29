"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Button,
  Checkbox,
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
} from "@mui/material";
import {
  Search as SearchIcon,
  RefreshCw as RefreshIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  ExternalLink as ExternalLinkIcon,
  GalleryHorizontal as GalleryIcon,
  UploadCloud as UploadCloudIcon,
  PencilLine as ReturnIcon,
  X as ClearIcon,
  ChevronDown as ChevronDownIcon,
  Trash2 as TrashIcon,
  RotateCcw as RestoreIcon,
  Archive as ArchiveIcon,
} from "lucide-react";
import { deleteArtwork, patchArtwork, publishArtworks } from "@services/artworks.service";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useArtworksCursor } from "@/hooks/useArtworksCursor";
import { useTechniques } from "@/hooks/useTechniques";
import { listPavilions, type PavilionDoc } from "@services/pavilions.service";
import { setCatalogReveal, setInventoryClose, setInventoryExtension, type InventoryExtension } from "@services/events.service";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { formatCOP } from "@/utils/money";
import { SHOP_URL } from "@/core/constants";
import { eyebrow } from "@/app/theme";
import ResponsiveRows from "@/components/common/ResponsiveRows";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import StatusPill from "@/components/ui/StatusPill";
import PublishArtworksDialog from "@components/views/events/PublishArtworksDialog";
import { useDialogs } from "@/components/ui/DialogsProvider";
import { toast } from "sonner";

/* Obras de la feria activa.
   Las cifras de arriba son también las pestañas: Todas / En el catálogo /
   Ocultas. Cada obra se publica u oculta desde su fila, varias a la vez
   marcándolas, o todo lo filtrado desde el botón principal (que cambia según
   la pestaña). Los ajustes de la feria (revelar, cierre, plazos) van plegados:
   se tocan poco y antes tapaban la lista. */

const formatPrice = (price?: number, currency = "COP") =>
  price == null ? "—" : formatCOP(price, { code: true, currency });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

type View = "" | "visible" | "hidden";

const artistName = (a: any) => [a?.firstName, a?.lastName].filter(Boolean).join(" ");

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
  const [view, setView] = useState<View>("");
  // Eliminadas con ventas quedan archivadas: fuera de la tienda y de esta lista.
  const [archived, setArchived] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
  } = useArtworksCursor({
    q,
    event,
    pavilion,
    artist,
    technique,
    limit: 24,
    includeHidden: 1,
    visibility: (!archived && view) || undefined,
    status: archived ? "archived" : undefined,
    // ponytail: el backend ya lo proyecta; se pide igual por si inventory-svc no se ha redesplegado.
    project: "hiddenUntilEvent",
  });

  // Respaldo en cliente por si el backend aún no entiende `visibility`.
  const shown = useMemo(
    () => (view === "" || archived ? rows : rows.filter((a: any) => (view === "hidden" ? !!a.hiddenUntilEvent : !a.hiddenUntilEvent))),
    [rows, view, archived]
  );

  // Lo que se publica/oculta en bloque es lo mismo que se está viendo.
  const publishScope = artist
    ? { scope: "artist" as const, artist }
    : pavilion
      ? { scope: "pavilion" as const, pavilion }
      : { scope: "all" as const };
  const scopeLabel = artist
    ? `las de ${artistOptions.find(([id]) => id === artist)?.[1] ?? "este artista"}`
    : pavilion
      ? `las de ${pavilions.find((p) => String(p.id) === pavilion)?.name ?? "este pabellón"}`
      : "todas";

  // Cuántas hay en el catálogo y cuántas ocultas con este alcance. Sale del
  // conteo en seco de publicar (no toca nada).
  // ponytail: cuenta por pabellón/artista, no por búsqueda ni técnica.
  const counts = useQuery({
    queryKey: ["artwork-visibility-counts", event, publishScope],
    queryFn: async () => {
      const [h, v] = await Promise.all([
        publishArtworks({ event, ...publishScope, publish: true, dryRun: true }),
        publishArtworks({ event, ...publishScope, publish: false, dryRun: true }),
      ]);
      return { hidden: h.matched, visible: v.matched };
    },
    staleTime: 10_000,
  });

  const refreshAll = () => {
    refetch();
    counts.refetch();
  };

  // Publicar u ocultar obras concretas (una fila o las marcadas).
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const setVisible = async (ids: string[], publish: boolean) => {
    if (!ids.length) return;
    setBusyIds(new Set(ids));
    try {
      const r = await publishArtworks({ event, scope: "ids", ids, publish });
      toast.success(
        `${r.modified} ${r.modified === 1 ? "obra" : "obras"} ${publish ? "publicadas en el catálogo" : "ocultas del catálogo"}`
      );
      setSelected(new Set());
      refreshAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "No se pudo cambiar. Intenta de nuevo.");
    } finally {
      setBusyIds(new Set());
    }
  };

  const toggleSel = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const allShownSelected = shown.length > 0 && shown.every((a: any) => selected.has(String(a.id)));
  const toggleAll = () =>
    setSelected(allShownSelected ? new Set() : new Set(shown.map((a: any) => String(a.id))));
  const selectedRows = shown.filter((a: any) => selected.has(String(a.id)));
  const selVisible = selectedRows.filter((a: any) => !a.hiddenUntilEvent).map((a: any) => String(a.id));
  const selHidden = selectedRows.filter((a: any) => a.hiddenUntilEvent).map((a: any) => String(a.id));

  const changeView = (v: View) => {
    setView(v);
    setArchived(false);
    setSelected(new Set());
  };

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
  const now = Date.now();
  const activeExt = extensions.filter((x) => new Date(x.until).getTime() >= now);
  const pastExt = extensions.filter((x) => new Date(x.until).getTime() < now);
  const [showPast, setShowPast] = useState(false);
  const [extArtist, setExtArtist] = useState("");
  const [extUntil, setExtUntil] = useState("");
  const saveExtension = async (artistId: string, until: string | null) => {
    setRevealBusy(true);
    try {
      await setInventoryExtension(event, artistId, until);
      await refetchEvent();
      setExtArtist("");
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setRevealBusy(false);
    }
  };
  const clearPastExtensions = async () => {
    setRevealBusy(true);
    try {
      // Uno por uno: cada llamada reescribe la lista del evento.
      for (const x of pastExt) await setInventoryExtension(event, String(x.artist), null);
      await refetchEvent();
      setShowPast(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "No se pudieron quitar todos. Intenta de nuevo.");
    } finally {
      setRevealBusy(false);
    }
  };

  // Devolver una obra al artista: puede editarla UNA vez aunque la carga haya
  // cerrado (p. ej. subió una serie con stock 1). Al guardar él, se vuelve a cerrar.
  const dialogs = useDialogs();
  const [returningId, setReturningId] = useState<string | null>(null);
  const toggleReturn = async (art: any) => {
    const unlock = !art.editUnlocked;
    let editNote = "";
    if (unlock) {
      const note = await dialogs.prompt({
        eyebrow: "Devolver al artista",
        title: `Devolver “${art.title}” para que la corrija`,
        message: "El artista puede editar esta obra una vez, aunque la carga esté cerrada. La nota le sale junto a la obra.",
        label: "¿Qué tiene que revisar? (opcional)",
        defaultValue: "Revisa el número de reproducciones (stock).",
        multiline: true,
        confirmText: "Devolver",
      });
      if (note === null) return; // canceló
      editNote = note.trim();
    }
    setReturningId(String(art.id));
    try {
      await patchArtwork(String(art.id), { editUnlocked: unlock, editNote });
      await refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "No se pudo cambiar. Intenta de nuevo.");
    } finally {
      setReturningId(null);
    }
  };

  // Eliminar: sin ventas se borra de verdad; con ventas (409) se archiva, porque
  // borrarla dejaría órdenes y liquidaciones sin obra.
  const removeArtwork = async (art: any) => {
    const id = String(art.id);
    const ok = await dialogs.confirm({
      eyebrow: "Eliminar obra",
      title: `¿Eliminar “${art.title || "Sin título"}”?`,
      message:
        "Si nunca se vendió, se borra para siempre. Si tiene ventas, se archiva: sale de la tienda y de esta lista, y se recupera en «Ver archivadas».",
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    setBusyIds(new Set([id]));
    try {
      await deleteArtwork(id);
      toast.success("Obra eliminada");
    } catch (e: any) {
      if (e?.response?.status !== 409) {
        toast.error(e?.response?.data?.error || "No se pudo eliminar. Intenta de nuevo.");
        return;
      }
      try {
        if (art.status !== "archived") await patchArtwork(id, { status: "archived" });
        toast.success("Tenía ventas: quedó archivada. Se recupera en «Ver archivadas».");
      } catch (e2: any) {
        toast.error(e2?.response?.data?.error || "No se pudo archivar. Intenta de nuevo.");
      }
    } finally {
      setBusyIds(new Set());
      refreshAll();
    }
  };

  const restoreArtwork = async (art: any) => {
    const id = String(art.id);
    setBusyIds(new Set([id]));
    try {
      await patchArtwork(id, { status: "published" });
      toast.success("Obra restaurada");
      refreshAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "No se pudo restaurar. Intenta de nuevo.");
    } finally {
      setBusyIds(new Set());
    }
  };

  const deleteButton = (art: any) => (
    <Tooltip title={art.status === "archived" ? "Borrar para siempre (solo si nunca se vendió)" : "Eliminar obra"}>
      <span>
        <IconButton size="small" color="error" disabled={busyIds.has(String(art.id))} onClick={() => removeArtwork(art)} aria-label="Eliminar obra">
          <TrashIcon size={18} />
        </IconButton>
      </span>
    </Tooltip>
  );

  const hasFilter = !!(q || pavilion || artist || technique);
  const clearFilters = () => { setQ(""); setPavilion(""); setArtist(""); setTechnique(""); };

  const revealed = !!selectedEvent?.catalogRevealed;
  const closeAt = selectedEvent?.inventoryCloseAt as string | undefined;
  const closed = !!closeAt && new Date(closeAt).getTime() < now;

  const statusPill = (art: any) =>
    art.status === "archived" ? <StatusPill tone="bad" label="Archivada" /> : art.hiddenUntilEvent ?<StatusPill tone="warn" label="Oculta" /> : <StatusPill tone="ok" dot label="En el catálogo" />;

  const visibilityButton = (art: any) => {
    const id = String(art.id);
    const hidden = !!art.hiddenUntilEvent;
    if (archived)
      return (
        <Button
          size="small"
          variant="outlined"
          color="success"
          disabled={busyIds.has(id)}
          startIcon={<RestoreIcon size={14} />}
          onClick={() => restoreArtwork(art)}
          sx={{ whiteSpace: "nowrap", minWidth: 104 }}
        >
          Restaurar
        </Button>
      );
    return (
      <Button
        size="small"
        variant="outlined"
        color={hidden ? "success" : "inherit"}
        disabled={busyIds.has(id)}
        startIcon={hidden ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
        onClick={() => setVisible([id], hidden)}
        sx={{ whiteSpace: "nowrap", minWidth: 104 }}
      >
        {hidden ? "Publicar" : "Ocultar"}
      </Button>
    );
  };

  return (
    <Box>
      <PageHeader
        crumb="Inventario"
        title="Obras"
        description={`${selectedEvent?.name ?? "Feria"} · lo que suben los artistas llega oculto. Publícalas cuando estén revisadas; puedes volver a ocultarlas cuando quieras.`}
        actions={[
          view === "visible"
            ? { label: `Ocultar ${scopeLabel}`, kind: "pri", icon: <EyeOffIcon size={14} />, onClick: () => setPublishOpen(true) }
            : { label: `Publicar ${scopeLabel}`, kind: "pri", icon: <UploadCloudIcon size={14} />, onClick: () => setPublishOpen(true) },
          { label: "Estado de carga", kind: "sec", href: "/inventory/carga" },
          { label: "Actualizar", kind: "sec", icon: <RefreshIcon size={14} />, disabled: isFetching, onClick: refreshAll },
        ]}
      />

      {/* Las cifras son las pestañas de la lista. */}
      <KpiStrip
        loading={counts.isLoading}
        items={[
          {
            label: "Todas",
            value: (counts.data?.visible ?? 0) + (counts.data?.hidden ?? 0),
            sub: hasFilter ? "con este pabellón/artista" : "cargadas en la feria",
            onClick: () => changeView(""),
            selected: view === "" && !archived,
          },
          {
            label: "En el catálogo",
            value: counts.data?.visible ?? 0,
            sub: "visibles al público",
            accent: true,
            onClick: () => changeView("visible"),
            selected: view === "visible" && !archived,
          },
          {
            label: "Ocultas",
            value: counts.data?.hidden ?? 0,
            sub: revealed ? "se ven: el catálogo está revelado" : "cargadas, sin publicar",
            onClick: () => changeView("hidden"),
            selected: view === "hidden" && !archived,
          },
        ]}
      />

      {/* Ajustes de la feria: plegados, con el resumen a la vista. */}
      <Accordion disableGutters sx={{ mb: 2, "&:before": { display: "none" } }}>
        <AccordionSummary expandIcon={<ChevronDownIcon size={16} />}>
          <Stack direction={{ xs: "column", sm: "row" }} gap={{ xs: 1, sm: 2 }} alignItems={{ sm: "center" }} sx={{ width: "100%", pr: 1 }}>
            <Typography sx={{ ...eyebrow, fontSize: 10, color: "text.secondary" }}>Ajustes de la feria</Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <StatusPill tone={revealed ? "ok" : "mid"} dot={revealed} label={revealed ? "Ocultas reveladas" : "Ocultas no se ven"} />
              <StatusPill
                tone={closed ? "bad" : closeAt ? "warn" : "mid"}
                label={closeAt ? `Carga ${closed ? "cerró" : "cierra"} ${fmtDate(closeAt)}` : "Carga sin cierre"}
              />
              {activeExt.length > 0 && <StatusPill tone="ok" label={`${activeExt.length} con plazo extra`} />}
            </Stack>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Stack divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />} gap={2}>
            {/* Revelar */}
            <Stack direction={{ xs: "column", md: "row" }} gap={2} justifyContent="space-between" alignItems={{ md: "center" }}>
              <Box>
                <Typography variant="body2" fontWeight={500}>Revelar las obras ocultas</Typography>
                <Typography variant="caption" color="text.secondary">
                  Encendido, el catálogo público muestra también las ocultas (pasa solo el día de la feria). Apagado, solo
                  las publicadas.
                </Typography>
              </Box>
              <Switch color="success" checked={revealed} disabled={revealBusy} onChange={(e) => toggleReveal(e.target.checked)} />
            </Stack>

            {/* Cierre de carga */}
            <Stack direction={{ xs: "column", md: "row" }} gap={2} justifyContent="space-between" alignItems={{ md: "center" }}>
              <Box>
                <Typography variant="body2" fontWeight={500}>Cierre de carga para artistas</Typography>
                <Typography variant="caption" color="text.secondary">
                  Después de esta fecha los artistas ya no crean ni editan obras. Vacío = sin cierre.
                </Typography>
              </Box>
              <TextField
                key={closeAt || "none"}
                size="small"
                type="datetime-local"
                defaultValue={toLocalInput(closeAt)}
                disabled={revealBusy}
                onBlur={(e) => {
                  if (e.target.value !== toLocalInput(closeAt)) saveInventoryClose(e.target.value);
                }}
                sx={{ minWidth: 240 }}
              />
            </Stack>

            {/* Plazos extendidos */}
            <Box>
              <Typography variant="body2" fontWeight={500}>Plazo extra para artistas</Typography>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1.5 }}>
                Estos artistas pueden seguir cargando y editando hasta su fecha, aunque la carga haya cerrado.
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
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
              </Stack>

              <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" sx={{ mt: 1.5 }}>
                {activeExt.length === 0 && (
                  <Typography variant="caption" color="text.secondary">Nadie tiene plazo extra vigente.</Typography>
                )}
                {activeExt.map((x) => (
                  <Chip
                    key={x.artist}
                    size="small"
                    color="success"
                    label={`${allArtists.get(String(x.artist)) ?? "Artista"} · hasta ${fmtDate(x.until)}`}
                    onDelete={revealBusy ? undefined : () => saveExtension(String(x.artist), null)}
                  />
                ))}
                {pastExt.length > 0 && (
                  <Button size="small" color="inherit" onClick={() => setShowPast((s) => !s)} sx={{ textTransform: "none" }}>
                    {showPast ? "Esconder vencidos" : `Ver ${pastExt.length} vencidos`}
                  </Button>
                )}
              </Stack>
              {showPast && pastExt.length > 0 && (
                <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" sx={{ mt: 1 }}>
                  {pastExt.map((x) => (
                    <Chip
                      key={x.artist}
                      size="small"
                      variant="outlined"
                      label={`${allArtists.get(String(x.artist)) ?? "Artista"} · venció ${fmtDate(x.until)}`}
                      onDelete={revealBusy ? undefined : () => saveExtension(String(x.artist), null)}
                    />
                  ))}
                  <Button size="small" color="error" disabled={revealBusy} onClick={clearPastExtensions} sx={{ textTransform: "none" }}>
                    Quitar todos los vencidos
                  </Button>
                </Stack>
              )}
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Obras */}
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
            <Button
              size="small"
              variant={archived ? "contained" : "outlined"}
              color={archived ? "error" : "inherit"}
              startIcon={<ArchiveIcon size={14} />}
              onClick={() => { setArchived((a) => !a); setSelected(new Set()); }}
              sx={{ textTransform: "none", whiteSpace: "nowrap" }}
            >
              {archived ? "Volver a las obras" : "Ver archivadas"}
            </Button>
            {hasFilter && (
              <Button size="small" color="inherit" startIcon={<ClearIcon size={14} />} onClick={clearFilters} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
                Limpiar
              </Button>
            )}
          </Stack>

          {/* Barra de selección: aparece al marcar obras. */}
          {selected.size > 0 ? (
            <Stack
              direction="row"
              gap={1}
              alignItems="center"
              flexWrap="wrap"
              sx={{ mt: 1.5, px: 1.5, py: 1, border: "1px solid", borderColor: "divider", backgroundColor: "action.hover" }}
            >
              <Typography variant="body2" fontWeight={500} sx={{ mr: 1 }}>
                {selected.size} {selected.size === 1 ? "marcada" : "marcadas"}
              </Typography>
              {!archived && selVisible.length > 0 && (
                <Button size="small" variant="contained" color="secondary" startIcon={<EyeOffIcon size={14} />} disabled={busyIds.size > 0} onClick={() => setVisible(selVisible, false)}>
                  Ocultar {selVisible.length}
                </Button>
              )}
              {!archived && selHidden.length > 0 && (
                <Button size="small" variant="contained" color="success" startIcon={<EyeIcon size={14} />} disabled={busyIds.size > 0} onClick={() => setVisible(selHidden, true)}>
                  Publicar {selHidden.length}
                </Button>
              )}
              <Button size="small" color="inherit" onClick={() => setSelected(new Set())} sx={{ textTransform: "none" }}>
                Quitar selección
              </Button>
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
              Mostrando {shown.length} de {totalLabel}
              {archived
                ? " archivadas · no salen en la tienda ni se pueden vender. Restaurar las devuelve como estaban."
                : `${view === "visible" ? " en el catálogo" : view === "hidden" ? " ocultas" : ""} · marca varias para publicarlas u ocultarlas juntas.`}
            </Typography>
          )}
        </CardContent>

        {(isLoading || isFetching) && <LinearProgress />}

        <ResponsiveRows
          loading={isLoading}
          emptyText={archived ? "No hay obras archivadas." : view === "visible" ? "No hay obras en el catálogo con estos filtros." : view === "hidden" ? "No hay obras ocultas con estos filtros." : "No hay obras que coincidan con los filtros."}
          cards={shown.map((art: any) => ({
            id: String(art.id),
            title: (
              <Link href={`/inventory/artworks/${art.id}`} style={{ color: "inherit" }}>
                {art.title || "Sin título"}
              </Link>
            ),
            subtitle: artistName(art.artistInfo) || undefined,
            badge: statusPill(art),
            fields: [
              { label: "Precio", value: formatPrice(art.price) },
              { label: "Stock", value: String(art.stock ?? 0) },
              { label: "Técnica", value: art.techniqueInfo?.name },
              { label: "Pabellón", value: art.pavilionInfo?.name },
            ],
            actions: (
              <Stack direction="row" gap={0.5} alignItems="center">
                {visibilityButton(art)}
                {deleteButton(art)}
              </Stack>
            ),
          }))}
        >
        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={allShownSelected}
                    indeterminate={selected.size > 0 && !allShownSelected}
                    onChange={toggleAll}
                    inputProps={{ "aria-label": "Marcar todas las que se ven" }}
                  />
                </TableCell>
                <TableCell>Obra</TableCell>
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
                  <TableCell colSpan={8} align="center">
                    <Typography color="error">
                      {(error as any)?.message ?? "Error desconocido"}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !isError && shown.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    {archived
                      ? "No hay obras archivadas."
                      : view === "visible"
                      ? "No hay obras en el catálogo con estos filtros."
                      : view === "hidden"
                        ? "No hay obras ocultas con estos filtros."
                        : "No hay obras que coincidan con los filtros."}
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                shown.map((art: any) => {
                  const id = String(art.id);
                  return (
                    <TableRow key={id} hover selected={selected.has(id)}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={selected.has(id)} onChange={() => toggleSel(id)} />
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" gap={1.5} alignItems="center">
                          <Avatar
                            variant="rounded"
                            src={art.image || art.images?.[0]}
                            sx={{ width: 52, height: 52, opacity: art.hiddenUntilEvent ? 0.55 : 1 }}
                          >
                            <GalleryIcon size={18} />
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Link href={`/inventory/artworks/${art.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                              <Typography fontWeight={500} sx={{ "&:hover": { color: "primary.main" } }}>
                                {art.title || "Sin título"}
                              </Typography>
                            </Link>
                            <Typography variant="body2" color="text.secondary">
                              {artistName(art.artistInfo) || "—"}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell>{art.techniqueInfo?.name ?? "—"}</TableCell>
                      <TableCell>{art.pavilionInfo?.name ?? "—"}</TableCell>
                      <TableCell align="right">{formatPrice(art.price)}</TableCell>
                      <TableCell align="center">{art.stock ?? 0}</TableCell>
                      <TableCell>
                        <Stack direction="row" gap={0.5} flexWrap="wrap">
                          {statusPill(art)}
                          {art.editUnlocked && <StatusPill tone="warn" label="En edición" />}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" gap={0.5} justifyContent="flex-end" alignItems="center">
                          {visibilityButton(art)}
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
                                disabled={returningId === id}
                                onClick={() => toggleReturn(art)}
                              >
                                <ReturnIcon size={18} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={art.hiddenUntilEvent ? "Oculta: en el sitio no aparece todavía" : "Ver en el sitio"}>
                            <IconButton size="small" component="a" href={`${SHOP_URL}/obra/${art.id}`} target="_blank" rel="noopener">
                              <ExternalLinkIcon size={18} />
                            </IconButton>
                          </Tooltip>
                          {deleteButton(art)}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}

              {shown.length > 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    {hasNextPage ? (
                      <Button variant="contained" disabled={isFetchingNextPage} onClick={loadMore}>
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
        initial={{ ...publishScope, publish: view !== "visible" }}
        onDone={refreshAll}
      />
    </Box>
  );
}
