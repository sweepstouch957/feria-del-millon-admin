"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, Button, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, LinearProgress,
} from "@mui/material";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { getAttendanceReport, getTicketDays, type AttendanceBucket } from "@services/ticket.service";
import { toCsv, downloadCsv } from "@/utils/csv";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import { eyebrow } from "@/app/theme";

const todayCo = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

function BucketTable({ title, rows }: { title: string; rows: AttendanceBucket[] }) {
  return (
    <Card sx={{ flex: 1 }}><CardContent>
      <Typography sx={{ fontSize: 17, letterSpacing: "0.01em", pb: 1.5, mb: 1, borderBottom: "1px solid", borderColor: "divider" }}>
        {title}
      </Typography>
      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell /><TableCell align="right">Entradas</TableCell><TableCell align="right">Personas</TableCell><TableCell align="right">Ingresaron</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={4} align="center" sx={{ color: "text.secondary" }}>Sin datos</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell>{r.label}</TableCell>
                <TableCell align="right">{r.tickets}</TableCell>
                <TableCell align="right">{r.persons}</TableCell>
                <TableCell align="right"><b>{r.attended}</b></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </CardContent></Card>
  );
}

export default function AttendancePage() {
  // La feria activa manda: sin ella no hay nada que pedir.
  const { eventId, isLoading, isError, refetch } = useActiveEvent();
  if (!eventId) return <ActiveEventGate isLoading={isLoading} isError={isError} onRetry={refetch} />;
  return <Attendance eventId={eventId} />;
}

function Attendance({ eventId }: { eventId: string }) {
  const { data: daysRes } = useQuery({ queryKey: ["ticketDays", eventId], queryFn: () => getTicketDays(eventId) });
  const [date, setDate] = React.useState(todayCo());

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["attendance", eventId, date],
    queryFn: () => getAttendanceReport(eventId, date),
    refetchInterval: 60_000,
  });

  const exportCsv = () =>
    downloadCsv(`asistentes_${date}.csv`, toCsv(data?.rows || [], [
      { header: "Código", value: (r) => r.shortCode, text: true },
      { header: "Nombre", value: (r) => r.name },
      { header: "Acompañante", value: (r) => r.companion },
      { header: "Email", value: (r) => r.email },
      { header: "Teléfono", value: (r) => r.phone, text: true },
      { header: "Empresa", value: (r) => r.company },
      { header: "Categoría", value: (r) => r.category },
      { header: "Tipo", value: (r) => r.type },
      { header: "Método de pago", value: (r) => r.method },
      { header: "Valor (COP)", value: (r) => r.price },
      { header: "Personas", value: (r) => r.persons },
      { header: "Ingresaron", value: (r) => r.attended },
      { header: "Hora de ingreso", value: (r) => (r.checkedAt ? new Date(r.checkedAt).toLocaleTimeString("es-CO", { timeZone: "America/Bogota" }) : "") },
    ]));

  const t = data?.totals;

  return (
    <Box>
      <PageHeader
        crumb="Boletos"
        title="Informe de asistentes"
        description="Por día: invitación, preventa y taquilla. Se actualiza cada minuto."
        actions={[
          {
            label: "Exportar Excel",
            kind: "sec",
            icon: <FileSpreadsheet size={14} />,
            disabled: !data?.rows.length,
            onClick: exportCsv,
          },
          {
            label: "Actualizar",
            kind: "sec",
            icon: <RefreshCw size={14} />,
            disabled: isFetching,
            onClick: () => refetch(),
          },
        ]}
      >
        <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
          <Typography sx={{ ...eyebrow, fontSize: 9.5, color: "text.secondary" }}>Día</Typography>
          <TextField select size="small" value={date} onChange={(e) => setDate(e.target.value)} sx={{ minWidth: 190 }}>
            {!daysRes?.days.some((d) => d.date === date) && <MenuItem value={date}>{date}</MenuItem>}
            {(daysRes?.days || []).map((d) => <MenuItem key={d.date} value={d.date}>{d.display || d.date}</MenuItem>)}
          </TextField>
        </Stack>
      </PageHeader>

      <Box sx={{ height: 2, mb: 2 }}>{isFetching && <LinearProgress />}</Box>

      <KpiStrip
        items={[
          { label: "Entradas válidas", value: t?.tickets ?? 0 },
          { label: "Personas esperadas", value: t?.persons ?? 0 },
          { label: "Ingresaron", value: t?.attended ?? 0, accent: true },
        ]}
      />

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <BucketTable title="Por categoría" rows={data?.byCategory || []} />
        <BucketTable title="Por tipo de entrada" rows={data?.byType || []} />
      </Stack>
    </Box>
  );
}
