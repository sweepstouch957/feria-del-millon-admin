"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";

import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";

import { useEventsManager } from "@hooks/events/useEventsManager";
import { usePavilionsManager } from "@hooks/events/usePavilionsManager";

import EventInfoCard from "@components/views/events/EventInfoCard";
import {
  CreatePavilionDialog,
} from "@components/views/events/CreateDialogs";
import CreateConvocatoriaDialog from "@components/views/events/CreateConvocatoriaDialog";
import PavilionSalesCard from "@components/views/events/PavilionSalesCard";
import PavilionDetailCard from "@components/views/events/PavilionDetailCard";
import PavilionsTableCard from "@components/views/events/PavilionsTableCard";
import PavilionArtistsManager from "@components/views/events/PavilionArtistsManager";

import type { EventStatus } from "@services/events.service";

/* Detalle de una feria: su información + sus pabellones, artistas y ventas.
   El listado vive en /events. */

const STATUS_LABEL: Record<EventStatus, string> = {
  active: "Activa",
  draft: "Borrador",
  finalizado: "Finalizada",
  archived: "Archivada",
};

const STATUS_COLOR: Record<EventStatus, "success" | "default" | "info" | "warning"> = {
  active: "success",
  draft: "default",
  finalizado: "info",
  archived: "warning",
};

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("es-CO", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtMoney = (n?: number) => (n == null ? "?" : `$${n.toLocaleString("es-CO")}`);

const priceRange = (min?: number, max?: number, currency = "COP") =>
  min == null && max == null ? "—" : `${fmtMoney(min)} – ${fmtMoney(max)} ${currency}`;

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ minWidth: 140, flex: "1 1 140px", px: 2, py: 1.5 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ letterSpacing: "0.12em", textTransform: "uppercase", fontSize: "0.65rem" }}
      >
        {label}
      </Typography>
      <Typography variant="subtitle1" fontWeight={500} sx={{ mt: 0.25 }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = String(params?.id ?? "");
  const queryClient = useQueryClient();

  const {
    events,
    loadingEvents,
    fetchingEvents,
    selectedEvent,
    selectedEventId,
    eventForm,
    handleSelectEvent,
    handleEventFieldChange,
    handleToggleEventStatus,
    handleSaveEvent,
    isSavingEvent,
  } = useEventsManager(eventId);

  const {
    pavilions,
    loadingPavilions,
    fetchingPavilions,
    pavilionColumns,
    pavilionForm,
    selectedPavilion,
    handleSelectPavilion,
    handlePavilionFieldChange,
    handleTogglePavilionActive,
    handleSavePavilion,
    isSavingPavilion,
  } = usePavilionsManager(eventId);

  const [newPavilionOpen, setNewPavilionOpen] = React.useState(false);
  const [newConvocatoriaOpen, setNewConvocatoriaOpen] = React.useState(false);

  const notFound = !loadingEvents && events.length > 0 && !selectedEvent;
  const artistCount = pavilions.reduce((acc, p) => acc + (p.artistInfo?.length ?? 0), 0);

  if (notFound) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={500} mb={1}>
          Esta feria no existe
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Puede que la hayan borrado o que el enlace esté mal.
        </Typography>
        <Button
          component={Link}
          href="/events"
          variant="outlined"
          startIcon={<ArrowLeft size={16} />}
          sx={{ borderRadius: 0 }}
        >
          Volver a las ferias
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* ───────── Encabezado ───────── */}
      <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
        <IconButton size="small" onClick={() => router.push("/events")} aria-label="Volver">
          <ArrowLeft size={18} />
        </IconButton>
        <Typography variant="caption" color="text.secondary">
          <Link href="/events" style={{ color: "inherit", textDecoration: "none" }}>
            Ferias
          </Link>{" "}
          / {selectedEvent?.name ?? "…"}
        </Typography>
      </Stack>

      <Stack
        direction="row"
        flexWrap="wrap"
        alignItems="flex-end"
        justifyContent="space-between"
        gap={2}
        mb={2}
      >
        <Box>
          <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
            <Typography variant="h4" fontWeight={500}>
              {selectedEvent?.name ?? "Cargando…"}
            </Typography>
            {selectedEvent && (
              <Chip
                size="small"
                label={STATUS_LABEL[selectedEvent.status] ?? selectedEvent.status}
                color={STATUS_COLOR[selectedEvent.status] ?? "default"}
                sx={{ borderRadius: 0 }}
              />
            )}
          </Stack>
          {selectedEvent && (
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              /{selectedEvent.slug}
            </Typography>
          )}
        </Box>

        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<Plus size={16} />}
            onClick={() => setNewPavilionOpen(true)}
            disabled={!selectedEvent}
            sx={{ borderRadius: 0 }}
          >
            Nuevo pabellón
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setNewConvocatoriaOpen(true)}
            disabled={!selectedEvent}
            sx={{ borderRadius: 0 }}
          >
            Nueva convocatoria
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ height: 4, mb: 2 }}>
        {(fetchingEvents || fetchingPavilions) && <LinearProgress />}
      </Box>

      {/* ───────── Resumen ───────── */}
      <Card variant="outlined" sx={{ borderRadius: 0, mb: 3 }}>
        <Stack
          direction="row"
          flexWrap="wrap"
          divider={
            <Box
              sx={{
                borderLeft: "1px solid",
                borderColor: "divider",
                display: { xs: "none", sm: "block" },
              }}
            />
          }
        >
          <Stat label="Inicio" value={fmtDate(selectedEvent?.validFrom)} />
          <Stat label="Fin" value={fmtDate(selectedEvent?.validTo)} />
          <Stat label="Pabellones" value={loadingPavilions ? "…" : pavilions.length} />
          <Stat label="Artistas asignados" value={loadingPavilions ? "…" : artistCount} />
          <Stat
            label="Precio de obra"
            value={priceRange(
              selectedEvent?.minArtworkPrice,
              selectedEvent?.maxArtworkPrice,
              selectedEvent?.currency ?? "COP"
            )}
          />
        </Stack>
      </Card>

      {/* ───────── Contenido ───────── */}
      <Box
        sx={{
          display: "grid",
          gap: 3,
          alignItems: "start",
          gridTemplateColumns: { xs: "1fr", lg: "1.1fr 2fr" },
        }}
      >
        <EventInfoCard
          hideSelector
          events={events}
          loadingEvents={loadingEvents}
          selectedEvent={selectedEvent}
          selectedEventId={selectedEventId}
          eventForm={eventForm}
          onSelectEvent={handleSelectEvent}
          onFieldChange={handleEventFieldChange}
          onToggleStatus={handleToggleEventStatus}
          onSave={handleSaveEvent}
          isSaving={isSavingEvent}
        />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <PavilionsTableCard
            selectedEvent={selectedEvent}
            pavilions={pavilions}
            loadingPavilions={loadingPavilions}
            pavilionColumns={pavilionColumns}
            onSelectPavilion={handleSelectPavilion}
          />

          <PavilionDetailCard
            pavilionForm={pavilionForm}
            onFieldChange={handlePavilionFieldChange}
            onToggleActive={handleTogglePavilionActive}
            onSave={handleSavePavilion}
            isSaving={isSavingPavilion}
          />

          <Card variant="outlined" sx={{ borderRadius: 0 }}>
            <CardHeader
              title="Artistas del pabellón"
              subheader={
                selectedPavilion
                  ? `Artistas de "${selectedPavilion.name}"`
                  : "Selecciona un pabellón en la tabla para gestionar sus artistas"
              }
            />
            <CardContent>
              <PavilionArtistsManager
                eventId={eventId}
                pavilion={selectedPavilion ?? null}
              />
            </CardContent>
          </Card>

          <PavilionSalesCard
            eventId={eventId}
            highlightPavilionId={selectedPavilion?.id ?? null}
          />
        </Box>
      </Box>

      <CreateConvocatoriaDialog
        open={newConvocatoriaOpen}
        eventId={eventId}
        eventName={selectedEvent?.name}
        onClose={() => setNewConvocatoriaOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["pavilions", eventId] });
          queryClient.invalidateQueries({ queryKey: ["convocatorias"] });
        }}
      />

      <CreatePavilionDialog
        open={newPavilionOpen}
        eventId={eventId}
        eventName={selectedEvent?.name}
        onClose={() => setNewPavilionOpen(false)}
        onCreated={() =>
          queryClient.invalidateQueries({ queryKey: ["pavilions", eventId] })
        }
      />
    </Box>
  );
}
