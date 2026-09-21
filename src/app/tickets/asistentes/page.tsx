"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, Button, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, LinearProgress,
} from "@mui/material";
import { Users, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_EVENT_ID } from "@core/constants";
import { getAttendanceReport, getTicketDays, type AttendanceBucket } from "@services/ticket.service";
import { toCsv, downloadCsv } from "@/utils/csv";

const todayCo = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

function BucketTable({ title, rows }: { title: string; rows: AttendanceBucket[] }) {
  return (
    <Card sx={{ borderRadius: 0, flex: 1 }}><CardContent>
      <Typography fontWeight={500} mb={1}>{title}</Typography>
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
  const eventId = DEFAULT_EVENT_ID;
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
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: "auto" }}>
      <Stack direction="row" flexWrap="wrap" alignItems="center" spacing={1.5} mb={3} useFlexGap>
        <Box sx={{ width: 40, height: 40, bgcolor: "rgba(63,164,110,0.14)", color: "#3FA46E", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Users size={20} />
        </Box>
        <Box flex={1}>
          <Typography fontWeight={500} fontSize={20}>Informe de asistentes</Typography>
          <Typography variant="caption" color="text.secondary">Por día: invitación, preventa y taquilla. Se actualiza cada minuto.</Typography>
        </Box>
        <TextField select size="small" label="Día" value={date} onChange={(e) => setDate(e.target.value)} sx={{ minWidth: 180 }}>
          {!daysRes?.days.some((d) => d.date === date) && <MenuItem value={date}>{date}</MenuItem>}
          {(daysRes?.days || []).map((d) => <MenuItem key={d.date} value={d.date}>{d.display || d.date}</MenuItem>)}
        </TextField>
        <Button variant="outlined" startIcon={<FileSpreadsheet size={16} />} onClick={exportCsv} disabled={!data?.rows.length} sx={{ textTransform: "none" }}>
          Exportar Excel
        </Button>
        <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => refetch()} disabled={isFetching} sx={{ textTransform: "none" }}>
          Actualizar
        </Button>
      </Stack>
      {isFetching && <LinearProgress sx={{ mb: 2 }} />}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
        {[
          ["Entradas válidas", t?.tickets ?? 0],
          ["Personas esperadas", t?.persons ?? 0],
          ["Ingresaron", t?.attended ?? 0],
        ].map(([label, v]) => (
          <Card key={label} sx={{ borderRadius: 0, flex: 1 }}><CardContent>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography fontWeight={500} fontSize={26}>{v}</Typography>
          </CardContent></Card>
        ))}
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <BucketTable title="Por categoría" rows={data?.byCategory || []} />
        <BucketTable title="Por tipo de entrada" rows={data?.byType || []} />
      </Stack>
    </Box>
  );
}
