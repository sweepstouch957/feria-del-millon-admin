"use client";

import {
  Box,
  Typography,
  LinearProgress,
  Card,
  CardHeader,
  CardContent,
} from "@mui/material";

import { useEventsManager } from "@hooks/events/useEventsManager";
import { usePavilionsManager } from "@hooks/events/usePavilionsManager";

import EventInfoCard from "@components/views/events/EventInfoCard";
import PavilionDetailCard from "@components/views/events/PavilionDetailCard";
import PavilionsTableCard from "@components/views/events/PavilionsTableCard";
import PavilionArtistsManager from "@components/views/events/PavilionArtistsManager";

export default function EventsManagerPage() {
  // 🎯 Hook de eventos
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
  } = useEventsManager();

  // 🎯 Hook de pabellones (enlazado al evento seleccionado)
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
  } = usePavilionsManager(selectedEventId);

  const loadingAny = fetchingEvents || fetchingPavilions;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={1}>
        Gestión de Eventos &amp; Pabellones
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Selecciona un evento para ver y editar su información, y administra
        los pabellones asociados y sus artistas.
      </Typography>

      {loadingAny && (
        <Box mb={2}>
          <LinearProgress />
        </Box>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", md: "1.2fr 2fr" },
        }}
      >
        {/* ───────── Panel izquierdo: Evento ───────── */}
        <EventInfoCard
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

        {/* ───────── Panel derecho: Pabellones ───────── */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <PavilionsTableCard
            selectedEvent={selectedEvent}
            pavilions={pavilions}
            loadingPavilions={loadingPavilions}
            pavilionColumns={pavilionColumns}
            onSelectPavilion={handleSelectPavilion}
          />

          {/* Gestión de artistas del pabellón */}
          <Card variant="outlined" sx={{ borderRadius: 3, mt: 2 }}>
            <CardHeader
              title="Artistas del pabellón"
              subheader={
                selectedPavilion
                  ? `Gestiona los artistas del pabellón "${selectedPavilion.name}"`
                  : "Selecciona un pabellón en la tabla para gestionar sus artistas"
              }
            />
            <CardContent>
              <PavilionArtistsManager
                eventId={selectedEvent?.id ?? selectedEventId ?? ""}
                pavilion={selectedPavilion ?? null}
              />
            </CardContent>
          </Card>

          {/* Detalle del pabellón (datos básicos) */}
          <PavilionDetailCard
            pavilionForm={pavilionForm}
            onFieldChange={handlePavilionFieldChange}
            onToggleActive={handleTogglePavilionActive}
            onSave={handleSavePavilion}
            isSaving={isSavingPavilion}
          />
        </Box>
      </Box>
    </Box>
  );
}
