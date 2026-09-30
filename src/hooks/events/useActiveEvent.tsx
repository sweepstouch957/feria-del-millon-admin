"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, Card, CircularProgress } from "@mui/material";

import { listEvents, type EventDoc } from "@services/events.service";
import { ENV_EVENT_ID } from "@core/constants";

/* La feria con la que trabaja el panel. Las páginas de boletos usaban un
   ObjectId escrito a mano en constants.ts, de una feria que ya no existe: todas
   sus peticiones fallaban y no había forma de apuntarlas a la feria del año.
   Ahora se resuelve la feria ACTIVA (la que se marca en /events).
   NEXT_PUBLIC_EVENT_ID sigue mandando si está puesta, para pruebas. */

const startOf = (e: EventDoc) => new Date(e.validFrom || 0).getTime() || 0;

/** Activa y, entre varias activas, la que empiece más tarde. Sin ninguna
 *  activa cae en la más reciente para no dejar el panel en blanco. */
function pickEvent(events: EventDoc[]): EventDoc | null {
  if (!events.length) return null;
  if (ENV_EVENT_ID) {
    const forced = events.find((e) => e.id === ENV_EVENT_ID);
    if (forced) return forced;
  }
  const byStart = [...events].sort((a, b) => startOf(b) - startOf(a));
  return byStart.find((e) => e.status === "active") ?? byStart[0];
}

export function useActiveEvent() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["events", "all"],
    queryFn: () => listEvents(),
    staleTime: 60_000,
  });

  const events = data ?? [];
  const event = React.useMemo(() => pickEvent(events), [events]);

  return {
    event,
    eventId: event?.id ?? "",
    eventName: event?.name ?? "",
    events,
    isLoading,
    isError,
    refetch,
  };
}

/** Qué mostrar mientras no hay feria: las páginas de boletos no pueden pedir
 *  nada sin eventId, así que no montan su contenido hasta tenerlo. */
export function ActiveEventGate({
  isLoading,
  isError,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}) {
  return (
    <Box sx={{ p: 3 }}>
      <Card variant="outlined" sx={{ borderRadius: 0, p: 3 }}>
        {isLoading ? (
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress size={24} />
          </Box>
        ) : isError ? (
          <Alert
            severity="error"
            action={
              onRetry ? (
                <Button size="small" onClick={onRetry}>
                  Reintentar
                </Button>
              ) : undefined
            }
          >
            No se pudieron cargar las ferias.
          </Alert>
        ) : (
          <Alert severity="info">
            No hay ninguna feria activa. Crea una en Eventos y márcala como activa para
            gestionar sus boletos.
          </Alert>
        )}
      </Card>
    </Box>
  );
}
