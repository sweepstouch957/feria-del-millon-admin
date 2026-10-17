"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, TextField, InputAdornment, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, LinearProgress, Alert,
} from "@mui/material";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import StatusPill, { type PillTone } from "@/components/ui/StatusPill";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { getInventoryStatus, type InventoryState, type InventoryStatusRow } from "@services/applications.service";
import { toCsv, downloadCsv, stamp } from "@/utils/csv";
import ArtistLoadDrawer from "@components/views/inventory/ArtistLoadDrawer";

/* Estado de la carga por artista. "Enviado" no es de la obra: es el botón
   "Enviar" del estudio, que queda en la postulación. Acá se cruza todo para
   ver quién se quedó a mitad de camino y por qué (sin proyecto, sin
   postulación, series con una copia…). */

const STATE: Record<InventoryState, { label: string; tone: PillTone; hint: string }> = {
  draft: { label: "Borrador", tone: "warn", hint: "Tiene obras pero le falta el proyecto, y no ha enviado" },
  ready: { label: "Listo sin enviar", tone: "warn", hint: "Tiene obras y proyecto; solo falta que le dé Enviar" },
  empty: { label: "Sin obras", tone: "mid", hint: "Está en un pabellón pero no ha cargado nada" },
  sent: { label: "Enviado", tone: "ok", hint: "Ya le dio Enviar" },
};
const FILTERS: (InventoryState | "all" | "issues")[] = ["all", "draft", "ready", "empty", "sent", "issues"];

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }) : "—";

export default function InventoryStatusPage() {
  const { eventId, isLoading, isError, refetch } = useActiveEvent();
  if (!eventId) return <ActiveEventGate isLoading={isLoading} isError={isError} onRetry={refetch} />;
  return <InventoryStatus eventId={eventId} />;
}

function InventoryStatus({ eventId }: { eventId: string }) {
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]>("all");
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState<InventoryStatusRow | null>(null);

  const { data: rows = [], isFetching, isError } = useQuery({
    queryKey: ["inventory-status", eventId],
    queryFn: () => getInventoryStatus(eventId),
    refetchInterval: 60_000, // la carga está viva: que se actualice sola
  });

  const count = (s: InventoryState) => rows.filter((r) => r.state === s).length;
  const withIssues = rows.filter((r) => r.issues.length).length;

  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (filter === "all" || (filter === "issues" ? r.issues.length > 0 : r.state === filter)) &&
      (!needle || `${r.name} ${r.email} ${r.pavilions.join(" ")}`.toLowerCase().includes(needle))
  );

  const exportCsv = () =>
    downloadCsv(`estado_carga_${stamp()}.csv`, toCsv(shown, [
      { header: "Artista", value: (r: InventoryStatusRow) => r.name },
      { header: "Email", value: (r) => r.email },
      { header: "Celular", value: (r) => r.phone, text: true },
      { header: "Pabellón", value: (r) => r.pavilions.join(" / ") },
      { header: "Estado", value: (r) => STATE[r.state].label },
      { header: "Obras", value: (r) => r.artworks },
      { header: "Copias", value: (r) => r.copies },
      { header: "Título del proyecto", value: (r) => r.projectTitle },
      { header: "Descripción", value: (r) => (r.hasReview ? "Sí" : "No") },
      { header: "Postulación", value: (r) => r.applicationStatus || "Sin postulación" },
      { header: "Enviado", value: (r) => fmt(r.sentAt) },
      { header: "Última obra", value: (r) => fmt(r.lastArtworkAt) },
      { header: "Revisar", value: (r) => r.issues.join("; ") },
    ]));

  return (
    <Box>
      <PageHeader
        crumb="Inventario"
        title="Estado de carga"
        description="Por artista: obras cargadas, proyecto y si ya le dio Enviar. Para encontrar a quien se quedó en borrador."
        actions={[{ label: "Exportar Excel", kind: "sec", disabled: !shown.length, onClick: exportCsv }]}
      />

      <KpiStrip
        items={[
          { label: "Artistas", value: rows.length },
          { label: "Enviaron", value: count("sent"), accent: true },
          { label: "Borrador", value: count("draft") },
          { label: "Listos sin enviar", value: count("ready") },
          { label: "Sin obras", value: count("empty") },
          { label: "Con algo por revisar", value: withIssues },
        ]}
      />

      <Card>
        {isFetching && <LinearProgress />}
        <CardContent>
          {isError && <Alert severity="error" sx={{ mb: 2 }}>No se pudo cargar el estado. Recarga la página.</Alert>}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} mb={2}>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {FILTERS.map((f) => (
                <Chip
                  key={f}
                  label={
                    f === "all" ? `Todos (${rows.length})`
                      : f === "issues" ? `Por revisar (${withIssues})`
                        : `${STATE[f].label} (${count(f)})`
                  }
                  color={filter === f ? "secondary" : "default"}
                  variant={filter === f ? "filled" : "outlined"}
                  onClick={() => setFilter(f)}
                />
              ))}
            </Stack>
            <Box flex={1} />
            <TextField
              size="small" placeholder="Buscar artista, correo o pabellón" value={q} onChange={(e) => setQ(e.target.value)}
              sx={{ minWidth: 280 }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={15} /></InputAdornment> } }}
            />
          </Stack>

          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Artista</TableCell>
                  <TableCell>Pabellón</TableCell>
                  <TableCell align="right">Obras</TableCell>
                  <TableCell>Proyecto</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Revisar</TableCell>
                  <TableCell>Última obra</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!shown.length ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ color: "text.secondary", py: 3 }}>
                      {isFetching ? "Cargando…" : "Nadie en este filtro."}
                    </TableCell>
                  </TableRow>
                ) : shown.map((r) => (
                  <TableRow key={r.artistId} hover onClick={() => setOpen(r)} sx={{ cursor: "pointer" }}>
                    <TableCell>
                      <Typography fontSize={13} fontWeight={500}>{r.name}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {r.email || "—"}
                        {r.phone ? ` · ${r.phone}` : ""}
                      </Typography>
                    </TableCell>
                    <TableCell>{r.pavilions.join(" / ") || "—"}</TableCell>
                    <TableCell align="right">
                      {r.artworks}
                      {r.copies > r.artworks && (
                        <Typography variant="caption" color="text.secondary" display="block">{r.copies} copias</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography fontSize={13} noWrap>{r.projectTitle || "—"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.hasReview ? "Con descripción" : "Sin descripción"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusPill label={STATE[r.state].label} tone={STATE[r.state].tone} />
                      {r.sentAt && <Typography variant="caption" color="text.secondary" display="block">{fmt(r.sentAt)}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" flexWrap="wrap" gap={0.5}>
                        {r.issues.map((i) => <Chip key={i} size="small" color="warning" variant="outlined" label={i} />)}
                        {r.returned > 0 && <Chip size="small" color="warning" label={`${r.returned} devuelta(s) a edición`} />}
                      </Stack>
                    </TableCell>
                    <TableCell>{fmt(r.lastArtworkAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="caption" color="text.secondary" display="block" mt={2}>
            Haz clic en un artista para ver su ficha: proyecto, obras una por una y un mensaje listo para escribirle.{" "}
            {Object.values(STATE).map((s) => `${s.label}: ${s.hint}.`).join(" ")}
          </Typography>
        </CardContent>
      </Card>

      <ArtistLoadDrawer eventId={eventId} row={open} onClose={() => setOpen(null)} />
    </Box>
  );
}
