"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";

import { Box, Button, LinearProgress, Stack, Typography } from "@mui/material";

import { useEventsManager } from "@hooks/events/useEventsManager";
import { usePavilionsManager } from "@hooks/events/usePavilionsManager";

import EventInfoCard from "@components/views/events/EventInfoCard";
import {
  CreatePavilionDialog,
} from "@components/views/events/CreateDialogs";
import CreateConvocatoriaDialog from "@components/views/events/CreateConvocatoriaDialog";
import ConvocatoriasCard from "@components/views/events/ConvocatoriasCard";
import PavilionSalesCard from "@components/views/events/PavilionSalesCard";
import PavilionsTableCard from "@components/views/events/PavilionsTableCard";
import PavilionDialog from "@components/views/events/PavilionDialog";

import PageHeader from "@components/ui/PageHeader";
import KpiStrip from "@components/ui/KpiStrip";
import StatusPill, { type PillTone } from "@components/ui/StatusPill";

import type { EventStatus } from "@services/events.service";

/* Detalle de una feria: su información + sus pabellones, artistas y ventas.
   El listado vive en /events. */

const STATUS_LABEL: Record<EventStatus, string> = {
  active: "Activa",
  draft: "Borrador",
  finalizado: "Finalizada",
  archived: "Archivada",
};

const STATUS_TONE: Record<EventStatus, PillTone> = {
  active: "ok",
  draft: "mid",
  finalizado: "mid",
  archived: "warn",
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

export default function EventDetailPage() {
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
  // La ficha del pabellón es una ventana: se abre desde su fila en la tabla.
  const [pavilionOpen, setPavilionOpen] = React.useState(false);

  const notFound = !loadingEvents && events.length > 0 && !selectedEvent;
  const artistCount = pavilions.reduce((acc, p) => acc + (p.artistInfo?.length ?? 0), 0);

  if (notFound) {
    return (
      <Box>
        <Typography variant="h4" mb={1}>
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
        >
          Volver a las ferias
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        crumb="Operación"
        back="/events"
        backLabel="Ferias"
        title={selectedEvent?.name ?? "Cargando…"}
        badge={
          selectedEvent ? (
            <StatusPill
              label={STATUS_LABEL[selectedEvent.status] ?? selectedEvent.status}
              tone={STATUS_TONE[selectedEvent.status] ?? "mid"}
            />
          ) : undefined
        }
        description={selectedEvent ? `/${selectedEvent.slug}` : undefined}
        actions={[
          {
            label: "Nuevo pabellón",
            kind: "sec",
            icon: <Plus size={14} />,
            disabled: !selectedEvent,
            onClick: () => setNewPavilionOpen(true),
          },
          {
            label: "Nueva convocatoria",
            kind: "pri",
            icon: <Plus size={14} />,
            disabled: !selectedEvent,
            onClick: () => setNewConvocatoriaOpen(true),
          },
        ]}
      />

      <Box sx={{ height: 2, mb: 2 }}>
        {(fetchingEvents || fetchingPavilions) && <LinearProgress />}
      </Box>

      <KpiStrip
        min={150}
        items={[
          { label: "Inicio", value: fmtDate(selectedEvent?.validFrom) },
          { label: "Fin", value: fmtDate(selectedEvent?.validTo) },
          { label: "Pabellones", value: loadingPavilions ? "…" : pavilions.length },
          { label: "Artistas asignados", value: loadingPavilions ? "…" : artistCount },
          {
            label: "Precio de obra",
            value: priceRange(
              selectedEvent?.minArtworkPrice,
              selectedEvent?.maxArtworkPrice,
              selectedEvent?.currency ?? "COP"
            ),
          },
        ]}
      />

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
            onSelectPavilion={(id) => {
              handleSelectPavilion(id);
              setPavilionOpen(true);
            }}
          />

          <ConvocatoriasCard
            eventId={eventId}
            onCreate={() => setNewConvocatoriaOpen(true)}
          />

          <PavilionSalesCard
            eventId={eventId}
            highlightPavilionId={selectedPavilion?.id ?? null}
          />
        </Box>
      </Box>

      <PavilionDialog
        open={pavilionOpen && !!selectedPavilion}
        onClose={() => setPavilionOpen(false)}
        eventId={eventId}
        pavilion={selectedPavilion ?? null}
        pavilions={pavilions}
        pavilionForm={pavilionForm}
        onFieldChange={handlePavilionFieldChange}
        onToggleActive={handleTogglePavilionActive}
        onSave={async () => {
          await handleSavePavilion();
          setPavilionOpen(false);
        }}
        isSaving={isSavingPavilion}
      />

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
