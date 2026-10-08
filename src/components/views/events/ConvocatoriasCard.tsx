"use client";

import * as React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { getConvocatorias, type Convocatoria } from "@services/events.service";
import { getApplicationStats } from "@services/applications.service";
import StatusPill from "@components/ui/StatusPill";
import { eyebrow } from "@/app/theme";
import ConvocatoriaDialog from "./ConvocatoriaDialog";

/* Las convocatorias de la feria.

   Van en la página de la feria porque son de la edición: cada año se abre una
   con sus fechas, su valor de inscripción y sus requisitos. Lo que se cambia
   acá es lo que el artista ve y llena cuando se postula, así que la fila dice
   de una el estado y las fechas, que es por lo que uno entra a mirar. */

const TONE: Record<string, "ok" | "bad" | "warn" | "mid"> = {
  open: "ok",
  selection: "warn",
  draft: "mid",
  closed: "bad",
  finalized: "mid",
  archived: "mid",
};

const LABEL: Record<string, string> = {
  open: "Abierta",
  selection: "En selección",
  draft: "Borrador",
  closed: "Cerrada",
  finalized: "Finalizada",
  archived: "Archivada",
};

const fmt = (iso?: string) =>
  iso
    ? new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(iso)
      )
    : "—";

const money = (n?: number, currency = "COP") =>
  typeof n === "number"
    ? new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 0 }).format(n)
    : "—";

/** Cuántas postulaciones recibió esta convocatoria, y cuántas se aceptaron.
 *  Es el número por el que se entra a mirar una convocatoria pasada. */
function Solicitudes({ convocatoriaId }: { convocatoriaId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["application-stats", convocatoriaId],
    queryFn: () => getApplicationStats(convocatoriaId),
    staleTime: 60_000,
  });

  return (
    <Box sx={{ flex: "0 1 130px" }}>
      <Typography sx={{ ...eyebrow, fontSize: 9, color: "text.secondary" }}>Solicitudes</Typography>
      {isLoading ? (
        <Skeleton variant="text" width={54} sx={{ fontSize: 14 }} />
      ) : (
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {data?.total ?? 0}
          {data?.byStatus?.accepted ? (
            <Typography component="span" variant="caption" color="text.secondary">
              {" "}· {data.byStatus.accepted} aceptadas
            </Typography>
          ) : null}
        </Typography>
      )}
    </Box>
  );
}

export default function ConvocatoriasCard({
  eventId,
  onCreate,
}: {
  eventId: string;
  onCreate?: () => void;
}) {
  const [editing, setEditing] = React.useState<Convocatoria | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["convocatorias", eventId],
    queryFn: () => getConvocatorias(eventId),
    enabled: !!eventId,
  });

  return (
    <Card variant="outlined" sx={{ borderRadius: 0 }}>
      <CardHeader
        title="Convocatorias"
        subheader="Fechas, inscripción y qué se le pide al artista"
        action={
          onCreate && (
            <Button size="small" color="inherit" startIcon={<Plus size={14} />} onClick={onCreate}>
              Nueva
            </Button>
          )
        }
        sx={{ pb: 1 }}
      />

      <CardContent sx={{ pt: 0 }}>
        {isLoading ? (
          <Stack gap={1.5}>
            {[0, 1].map((i) => (
              <Stack key={i} gap={0.75} sx={{ py: 1.5 }}>
                <Skeleton variant="text" width="40%" sx={{ fontSize: 18 }} />
                <Skeleton variant="text" width="60%" sx={{ fontSize: 12 }} />
              </Stack>
            ))}
          </Stack>
        ) : !rows.length ? (
          <Box sx={{ py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Esta feria todavía no tiene convocatoria. Crea una para que los artistas puedan
              postularse: queda en borrador hasta que la abras.
            </Typography>
          </Box>
        ) : (
          <Stack divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
            {rows.map((c) => (
              <Box
                key={c._id}
                role="button"
                tabIndex={0}
                onClick={() => setEditing(c)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setEditing(c)}
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 2,
                  py: 1.75,
                  cursor: "pointer",
                  "&:hover": { backgroundColor: "action.hover" },
                }}
              >
                <Box sx={{ flex: "1 1 220px", minWidth: 0 }}>
                  <Typography variant="body1" noWrap>
                    {c.name}
                  </Typography>
                  <Typography sx={{ ...eyebrow, fontSize: 9, color: "text.secondary", mt: 0.5 }}>
                    {fmt(c.startDate)} — {fmt(c.endDate)}
                  </Typography>
                </Box>

                <Box sx={{ flex: "0 1 140px" }}>
                  <Typography sx={{ ...eyebrow, fontSize: 9, color: "text.secondary" }}>
                    Inscripción
                  </Typography>
                  <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                    {money(c.fee, c.currency)}
                  </Typography>
                </Box>

                <Solicitudes convocatoriaId={c._id} />

                {/* "Obras" solo decía 3 y se leía como el total de solicitudes:
                    es el tope por artista, no un conteo. */}
                <Box sx={{ flex: "0 1 130px" }}>
                  <Typography sx={{ ...eyebrow, fontSize: 9, color: "text.secondary" }}>
                    Tope por artista
                  </Typography>
                  <Typography variant="body2">
                    {c.maxArtworksPerArtist ? `${c.maxArtworksPerArtist} obras` : "—"}
                  </Typography>
                </Box>

                <StatusPill label={LABEL[c.status] ?? c.status} tone={TONE[c.status] ?? "mid"} />
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>

      <ConvocatoriaDialog
        open={!!editing}
        convocatoria={editing}
        onClose={() => setEditing(null)}
      />
    </Card>
  );
}
