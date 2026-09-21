"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, Button, TextField, MenuItem, Tabs, Tab,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, CircularProgress, LinearProgress,
} from "@mui/material";
import { BarChart3, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSalesReport, type SalesBucket } from "@services/orders.service";
import { useEvents } from "@/hooks/useEvents";
import { usePavilions } from "@/hooks/usePavilions";
import { useTechniques } from "@/hooks/useTechniques";
import { formatCOP } from "@/utils/money";
import { toCsv, downloadCsv, stamp } from "@/utils/csv";

const money = (n?: number) => formatCOP(n, { code: true });

const VIEWS = [
  { key: "byDay", label: "Por día", col: "Día" },
  { key: "byPavilion", label: "Por pabellón", col: "Pabellón" },
  { key: "byArtist", label: "Por artista", col: "Artista" },
  { key: "byTechnique", label: "Por técnica", col: "Técnica" },
] as const;

function Kpi({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Card sx={{ borderRadius: 0, flex: 1, minWidth: 150 }}><CardContent>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography fontWeight={500} fontSize={24} color={color}>{value}</Typography>
    </CardContent></Card>
  );
}

export default function SalesReportPage() {
  const [f, setF] = React.useState({ event: "", from: "", to: "", pavilion: "", technique: "", artist: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value, ...(k === "event" ? { pavilion: "" } : {}) }));
  const [view, setView] = React.useState<(typeof VIEWS)[number]["key"]>("byDay");

  const { data: events = [] } = useEvents();
  const { data: pavilions = [] } = usePavilions(f.event || undefined);
  const { data: techniques = [] } = useTechniques();

  const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["reports", "sales", params],
    queryFn: () => getSalesReport(params),
    staleTime: 30_000,
  });

  // Lista de artistas sale del informe sin filtro de artista, para no perder opciones al elegir uno.
  const { data: base } = useQuery({
    queryKey: ["reports", "sales", { ...params, artist: undefined }],
    queryFn: () => getSalesReport({ ...params, artist: undefined }),
    staleTime: 30_000,
    enabled: !!f.artist,
  });
  const artists = (f.artist ? base?.byArtist : data?.byArtist) || [];

  const rows: SalesBucket[] = data?.[view] || [];
  const current = VIEWS.find((v) => v.key === view)!;

  const exportSummary = () =>
    downloadCsv(`ventas_${view}_${stamp()}.csv`, toCsv(rows, [
      { header: current.col, value: (r) => r.label },
      { header: "Unidades", value: (r) => r.units },
      { header: "Caja (COP)", value: (r) => r.caja },
      { header: "En línea (COP)", value: (r) => r.online },
      { header: "Total (COP)", value: (r) => r.amount },
    ]));
  const exportLines = () =>
    downloadCsv(`ventas_detalle_${stamp()}.csv`, toCsv(data?.lines || [], [
      { header: "Día", value: (l) => l.day },
      { header: "Pedido", value: (l) => l.orderId, text: true },
      { header: "Obra", value: (l) => l.artwork },
      { header: "Artista", value: (l) => l.artist },
      { header: "Técnica", value: (l) => l.technique },
      { header: "Pabellón", value: (l) => l.pavilion },
      { header: "Cantidad", value: (l) => l.qty },
      { header: "Valor (COP)", value: (l) => l.amount },
      { header: "Canal", value: (l) => l.channel },
      { header: "Método", value: (l) => l.method },
      { header: "Comprador", value: (l) => l.buyer },
      { header: "Email", value: (l) => l.buyerEmail },
      { header: "Teléfono", value: (l) => l.buyerPhone, text: true },
    ]));

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Stack direction="row" flexWrap="wrap" alignItems="center" spacing={1.5} mb={3} useFlexGap>
        <Box sx={{ width: 40, height: 40, bgcolor: "rgba(63,164,110,0.14)", color: "#3FA46E", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BarChart3 size={20} />
        </Box>
        <Box flex={1}>
          <Typography fontWeight={500} fontSize={20}>Informe de ventas</Typography>
          <Typography variant="caption" color="text.secondary">Obras pagadas, por día de pago (hora Colombia).</Typography>
        </Box>
        <Button variant="outlined" startIcon={<FileSpreadsheet size={16} />} onClick={exportSummary} disabled={!rows.length} sx={{ textTransform: "none" }}>
          Exportar resumen
        </Button>
        <Button variant="outlined" startIcon={<FileSpreadsheet size={16} />} onClick={exportLines} disabled={!data?.lines?.length} sx={{ textTransform: "none" }}>
          Exportar detalle
        </Button>
        <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => refetch()} disabled={isFetching} sx={{ textTransform: "none" }}>
          Actualizar
        </Button>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={3} useFlexGap flexWrap="wrap">
        <TextField size="small" select label="Feria" value={f.event} onChange={set("event")} sx={{ minWidth: 180 }}>
          <MenuItem value="">Todas</MenuItem>
          {events.map((e: any) => <MenuItem key={e.id || e._id} value={e.id || e._id}>{e.name}</MenuItem>)}
        </TextField>
        <TextField size="small" type="date" label="Desde" value={f.from} onChange={set("from")} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="Hasta" value={f.to} onChange={set("to")} InputLabelProps={{ shrink: true }} />
        <TextField size="small" select label="Pabellón" value={f.pavilion} onChange={set("pavilion")} sx={{ minWidth: 160 }}>
          <MenuItem value="">Todos</MenuItem>
          {pavilions.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Técnica" value={f.technique} onChange={set("technique")} sx={{ minWidth: 160 }}>
          <MenuItem value="">Todas</MenuItem>
          {techniques.map((t: any) => <MenuItem key={t.id || t._id} value={t.id || t._id}>{t.name}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Artista" value={f.artist} onChange={set("artist")} sx={{ minWidth: 180 }}>
          <MenuItem value="">Todos</MenuItem>
          {artists.map((a) => <MenuItem key={a.key} value={a.key}>{a.label}</MenuItem>)}
        </TextField>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3} useFlexGap flexWrap="wrap">
        <Kpi label="Total vendido" value={money(data?.total)} color="#3FA46E" />
        <Kpi label="Obras vendidas" value={data?.units ?? 0} />
        <Kpi label="Pedidos" value={data?.orders ?? 0} />
        <Kpi label="Caja / En línea" value={`${money(data?.byDay.reduce((a, r) => a + r.caja, 0))} / ${money(data?.byDay.reduce((a, r) => a + r.online, 0))}`} />
      </Stack>

      <Card sx={{ borderRadius: 0 }}>
        {isFetching && <LinearProgress />}
        <Tabs value={view} onChange={(_, v) => setView(v)} variant="scrollable" sx={{ px: 2 }}>
          {VIEWS.map((v) => <Tab key={v.key} value={v.key} label={v.label} sx={{ textTransform: "none" }} />)}
        </Tabs>
        <CardContent>
          {isLoading ? (
            <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{current.col}</TableCell>
                    <TableCell align="right">Unidades</TableCell>
                    <TableCell align="right">Caja</TableCell>
                    <TableCell align="right">En línea</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ color: "text.secondary", py: 3 }}>Sin ventas con estos filtros.</TableCell></TableRow>
                  ) : rows.map((r) => (
                    <TableRow key={r.key} hover>
                      <TableCell>{r.label}</TableCell>
                      <TableCell align="right">{r.units}</TableCell>
                      <TableCell align="right">{money(r.caja)}</TableCell>
                      <TableCell align="right">{money(r.online)}</TableCell>
                      <TableCell align="right"><b>{money(r.amount)}</b></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
