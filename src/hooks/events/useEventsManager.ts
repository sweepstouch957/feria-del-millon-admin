"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";

import {
  listEvents,
  type EventDoc,
  type EventStatus,
  type CreateEventDto,
  updateEvent,
} from "@services/events.service";

export type EventFormState = {
  name: string;
  slug: string;
  description?: string;
  status: EventStatus;
  validFrom: Dayjs | null;
  validTo: Dayjs | null;
  minArtworkPrice?: number;
  maxArtworkPrice?: number;
  currency?: string;
};

const toEventFormState = (event: EventDoc): EventFormState => ({
  name: event.name,
  slug: event.slug,
  description: event.description ?? "",
  status: event.status,
  validFrom: event.validFrom ? dayjs(event.validFrom) : null,
  validTo: event.validTo ? dayjs(event.validTo) : null,
  minArtworkPrice: event.minArtworkPrice,
  maxArtworkPrice: event.maxArtworkPrice,
  currency: event.currency ?? "COP",
});

export function useEventsManager() {
  const queryClient = useQueryClient();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState | null>(null);

  const {
    data: events,
    isLoading: loadingEvents,
    isFetching: fetchingEvents,
  } = useQuery({
    queryKey: ["events", "all"],
    queryFn: () => listEvents(),
  });

  const selectedEvent: EventDoc | undefined = useMemo(
    () => events?.find((e) => e.id === selectedEventId),
    [events, selectedEventId]
  );

  // Al cargar eventos, seleccionar el primero por defecto
  useEffect(() => {
    if (!events || events.length === 0) return;

    if (!selectedEventId) {
      setSelectedEventId(events[0].id);
      setEventForm(toEventFormState(events[0]));
    } else {
      const ev = events.find((e) => e.id === selectedEventId);
      if (ev) setEventForm(toEventFormState(ev));
    }
  }, [events, selectedEventId]);

  const updateEventMutation = useMutation({
    mutationKey: ["event", "update"],
    mutationFn: async (
      payload: Partial<CreateEventDto & { status?: EventStatus }>
    ) => {
      if (!selectedEvent) throw new Error("No event selected");
      return updateEvent(selectedEvent.id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events", "all"] });
    },
  });

  const handleSelectEvent = (id: string) => {
    setSelectedEventId(id);
    const ev = events?.find((e) => e.id === id);
    if (ev) {
      setEventForm(toEventFormState(ev));
    }
  };

  const handleEventFieldChange = (
    field: keyof EventFormState,
    value: string | number | Dayjs | null
  ) => {
    setEventForm((prev) =>
      prev ? { ...prev, [field]: value as any } : prev
    );
  };

  const handleToggleEventStatus = (checked: boolean) => {
    if (!selectedEvent || !eventForm) return;
    const newStatus: EventStatus = checked ? "active" : "archived";
    setEventForm({ ...eventForm, status: newStatus });
    updateEventMutation.mutate({ status: newStatus });
  };

  const handleSaveEvent = () => {
    if (!selectedEvent || !eventForm) return;

    const payload: Partial<CreateEventDto & { status?: EventStatus }> = {
      name: eventForm.name,
      slug: eventForm.slug,
      description: eventForm.description,
      status: eventForm.status,
      validFrom: eventForm.validFrom?.toISOString(),
      validTo: eventForm.validTo?.toISOString(),
      minArtworkPrice: eventForm.minArtworkPrice,
      maxArtworkPrice: eventForm.maxArtworkPrice,
      currency: eventForm.currency,
    };

    updateEventMutation.mutate(payload);
  };

  return {
    events: events ?? [],
    loadingEvents,
    fetchingEvents,
    selectedEvent: selectedEvent ?? null,
    selectedEventId,
    eventForm,
    handleSelectEvent,
    handleEventFieldChange,
    handleToggleEventStatus,
    handleSaveEvent,
    isSavingEvent: updateEventMutation.isPending,
  };
}
