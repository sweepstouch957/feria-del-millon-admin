"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronRight } from "lucide-react";

import {
  Box,
  Button,
  Card,
  Chip,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";

import { listEvents, type EventStatus } from "@services/events.service";
import { listPavilions, type PavilionDoc } from "@services/pavilions.service";
import { CreateEventDialog } from "@components/views/events/CreateDialogs";

/* Listado de ferias. Cada fila resume la feria y muestra SUS pabellones;
   toda la información editable vive en /events/[id]. */

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

const day = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleDateString("es-CO", opts);

/** "12 – 15 nov 2026" cuando cae en el mismo mes; si no, fecha completa a cada lado. */
function formatRange(from?: string, to?: string) {
  if (!from && !to) return "Sin fechas";
  if (from && !to) return `Desde ${day(from, { day: "numeric", month: "short", year: "numeric" })}`;
  if (!from && to) return `Hasta ${day(to!, { day: "numeric", month: "short", year: "numeric" })}`;

  const a = new Date(from!);
  const b = new Date(to!);
  const sameYear = a.getFullYear() === b.getFullYear();
  const sameMonth = sameYear && a.getMonth() === b.getMonth();

  const left = sameMonth
    ? String(a.getDate())
    : day(from!, { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });

  return `${left} – ${day(to!, { day: "numeric", month: "short", year: "numeric" })}`;
}

const MAX_CHIPS = 4;

function PavilionCell({
  pavilions,
  loading,
}: {
  pavilions: PavilionDoc[] | undefined;
  loading: boolean;
}) {
  if (loading && !pavilions) {
    return (
      <Typography variant="caption" color="text.secondary">
        Cargando…
      </Typography>
    );
  }
  if (!pavilions?.length) {
    return (
      <Typography variant="caption" color="text.secondary">
        Sin pabellones
      </Typography>
    );
  }

  const shown = pavilions.slice(0, MAX_CHIPS);
  const rest = pavilions.slice(MAX_CHIPS);

  return (
    <Stack direction="row" gap={0.5} flexWrap="wrap">
      {shown.map((p) => (
        <Chip
          key={p.id}
          size="small"
          variant={p.active ? "filled" : "outlined"}
          label={p.name}
          sx={{ borderRadius: 0, fontSize: "0.7rem", maxWidth: 190 }}
        />
      ))}
      {rest.length > 0 && (
        <Tooltip title={rest.map((p) => p.name).join(", ")}>
          <Chip
            size="small"
            variant="outlined"
            label={`+${rest.length}`}
            sx={{ borderRadius: 0, fontSize: "0.7rem" }}
          />
        </Tooltip>
      )}
    </Stack>
  );
}

export default function EventsListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newEventOpen, setNewEventOpen] = React.useState(false);

  const {
    data: events,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["events", "all"],
    queryFn: () => listEvents(),
  });

  // Los pabellones de cada feria, con la misma queryKey que usa la página de
  // detalle: al abrir una feria la tabla ya viene de caché.
  const pavilionQueries = useQueries({
    queries: (events ?? []).map((ev) => ({
      queryKey: ["pavilions", ev.id],
      queryFn: () => listPavilions(ev.id),
      staleTime: 60_000,
    })),
  });

  const rows = (events ?? []).map((ev, i) => ({
    event: ev,
    pavilions: pavilionQueries[i]?.data as PavilionDoc[] | undefined,
    loadingPavilions: !!pavilionQueries[i]?.isLoading,
  }));

  const busy = isFetching || pavilionQueries.some((q) => q.isFetching);

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction="row"
        flexWrap="wrap"
        alignItems="flex-end"
        justifyContent="space-between"
        gap={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={500}>
            Ferias
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Cada feria con sus pabellones. Abre una para editar su información,
            sus pabellones y los artistas de cada uno.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={() => setNewEventOpen(true)}
          sx={{ borderRadius: 0 }}
        >
          Nueva feria
        </Button>
      </Stack>

      <Box sx={{ height: 4, mb: 2 }}>{busy && <LinearProgress />}</Box>

      <Card variant="outlined" sx={{ borderRadius: 0 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Feria</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Fechas</TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 260 }}>Pabellones</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Artistas
                </TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary" py={2}>
                      Cargando ferias…
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary" py={2}>
                      Todavía no hay ferias. Crea la primera con “Nueva feria”.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {rows.map(({ event, pavilions, loadingPavilions }) => {
                const artistCount =
                  pavilions?.reduce((acc, p) => acc + (p.artistInfo?.length ?? 0), 0) ?? null;

                return (
                  <TableRow
                    key={event.id}
                    hover
                    onClick={() => router.push(`/events/${event.id}`)}
                    sx={{ cursor: "pointer", "& td": { py: 1.5 } }}
                  >
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={500}>
                        {event.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        /{event.slug}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={STATUS_LABEL[event.status] ?? event.status}
                        color={STATUS_COLOR[event.status] ?? "default"}
                        sx={{ borderRadius: 0 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {formatRange(event.validFrom, event.validTo)}
                      </Typography>
                      {pavilions && (
                        <Typography variant="caption" color="text.secondary">
                          {pavilions.length}{" "}
                          {pavilions.length === 1 ? "pabellón" : "pabellones"}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <PavilionCell pavilions={pavilions} loading={loadingPavilions} />
                    </TableCell>

                    <TableCell align="right">
                      <Typography variant="body2">
                        {artistCount == null ? "—" : artistCount}
                      </Typography>
                    </TableCell>

                    <TableCell align="right" sx={{ width: 48 }}>
                      <ChevronRight size={18} opacity={0.5} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <CreateEventDialog
        open={newEventOpen}
        onClose={() => setNewEventOpen(false)}
        onCreated={(id) => {
          queryClient.invalidateQueries({ queryKey: ["events", "all"] });
          router.push(`/events/${id}`);
        }}
      />
    </Box>
  );
}
