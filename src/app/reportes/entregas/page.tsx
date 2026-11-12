"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, TextField, MenuItem, Chip, Collapse, IconButton, LinearProgress,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, CircularProgress, ToggleButton, ToggleButtonGroup, Link,
} from "@mui/material";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import ReportTabs from "@/components/ui/ReportTabs";
import { getDeliveriesReport, type DeliveryArtist } from "@services/orders.service";
import { useEvents } from "@/hooks/useEvents";
import { formatCOP } from "@/utils/money";

/* Entregas de artistas: qué artistas ya entregaron a sus compradores las obras
   que vendieron y a cuáles les falta. El dato lo marca cada artista en su
   estudio ("Marcar entregada"); aquí solo se lee. */

type Filter = "all" | "pending" | "done";

const day = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota" }) : "—";

const STATUS: Record<string, { label: string; color: "success" | "warning" | "error" }> = {
  delivered: { label: "Entregada", color: "success" },
  pending: { label: "Por entregar", color: "warning" },
  returned: { label: "Devuelta", color: "error" },
};

function ArtistRow({ r }: { r: DeliveryArtist }) {
  const [open, setOpen] = React.useState(false);
  const done = r.pending === 0;
  const pct = r.sold ? Math.round((r.delivered / r.sold) * 100) : 0;

  return (
    <>
      <TableRow hover onClick={() => setOpen((v) => !v)} sx={{ cursor: "pointer", "& > td": { borderBottom: open ? 0 : undefined } }}>
        <TableCell sx={{ width: 44, pr: 0 }}>
          <IconButton size="small" aria-label={open ? "Ocultar obras" : "Ver obras"}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={600}>{r.name}</Typography>
          <Typography variant="caption" color="text.secondary">{[r.email, r.phone].filter(Boolean).join(" · ")}</Typography>
        </TableCell>
        <TableCell align="right">{r.sold}</TableCell>
        <TableCell align="right">{r.delivered}</TableCell>
        <TableCell align="right" sx={{ fontWeight: r.pending ? 700 : 400, color: r.pending ? "warning.main" : "text.secondary" }}>{r.pending}</TableCell>
        <TableCell sx={{ minWidth: 140 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <LinearProgress variant="determinate" value={pct} color={done ? "success" : "warning"} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
            <Typography variant="caption" sx={{ width: 34, textAlign: "right" }}>{pct}%</Typography>
          </Stack>
        </TableCell>
        <TableCell>
          <Chip size="small" color={done ? "success" : "warning"} variant={done ? "filled" : "outlined"} label={done ? "Entregó todo" : `Le faltan ${r.pending}`} />
        </TableCell>
        <TableCell sx={{ whiteSpace: "nowrap" }}>{day(r.lastDeliveredAt)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, bgcolor: "action.hover" }}>
          <Collapse in={open} unmountOnExit>
            <Table size="small" sx={{ my: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Obra</TableCell>
                  <TableCell>Pedido</TableCell>
                  <TableCell>Vendida</TableCell>
                  <TableCell>Comprador</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {r.items.map((i, k) => (
                  <TableRow key={`${i.orderId}-${k}`}>
                    <TableCell>{i.qty > 1 ? `${i.qty} × ` : ""}{i.title}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>#{i.code}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{day(i.soldAt)}</TableCell>
                    <TableCell>
                      {i.buyer || "—"}
                      {i.buyerPhone && <> · <Link href={`tel:${i.buyerPhone}`} underline="hover" onClick={(e) => e.stopPropagation()}>{i.buyerPhone}</Link></>}
                      {!i.hasAddress && <Typography component="span" variant="caption" color="text.secondary"> · sin dirección (entrega en feria)</Typography>}
                    </TableCell>
                    <TableCell align="right">{formatCOP(i.amount, { code: true })}</TableCell>
                    <TableCell>
                      <Chip size="small" color={STATUS[i.status].color} variant={i.status === "delivered" ? "filled" : "outlined"} label={i.status === "delivered" && i.deliveredAt ? `Entregada · ${day(i.deliveredAt)}` : STATUS[i.status].label} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function Page() {
  const [event, setEvent] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [q, setQ] = React.useState("");
  const { data: events = [] } = useEvents();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["reports", "deliveries", event],
    queryFn: () => getDeliveriesReport(event ? { event } : {}),
    staleTime: 30_000,
  });

  const t = data?.totals;
  const needle = q.trim().toLowerCase();
  const rows = (data?.rows || []).filter(
    (r) =>
      (filter === "all" || (filter === "pending" ? r.pending > 0 : r.pending === 0)) &&
      (!needle || `${r.name} ${r.email}`.toLowerCase().includes(needle))
  );

  return (
    <Box>
      <PageHeader
        crumb="Reportes"
        title="Entregas de artistas"
        description="Qué artistas ya entregaron a sus compradores las obras que vendieron. Cada artista lo marca en su estudio."
        actions={[{ label: "Actualizar", kind: "sec", icon: <RefreshCw size={14} />, disabled: isFetching, onClick: () => refetch() }]}
      />
      <ReportTabs />

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={3} useFlexGap flexWrap="wrap" alignItems={{ md: "center" }}>
        <TextField size="small" select label="Feria" value={event} onChange={(e) => setEvent(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">Todas</MenuItem>
          {events.map((e: any) => <MenuItem key={e.id || e._id} value={e.id || e._id}>{e.name}</MenuItem>)}
        </TextField>
        <TextField size="small" label="Buscar artista" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: 220 }} />
        <ToggleButtonGroup size="small" exclusive value={filter} onChange={(_, v) => v && setFilter(v)}>
          <ToggleButton value="all">Todos{t ? ` · ${t.artists}` : ""}</ToggleButton>
          <ToggleButton value="pending">Les falta{t ? ` · ${t.artists - t.artistsDone}` : ""}</ToggleButton>
          <ToggleButton value="done">Entregaron todo{t ? ` · ${t.artistsDone}` : ""}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <KpiStrip
        loading={isLoading}
        items={[
          { label: "Artistas que entregaron todo", value: t ? `${t.artistsDone} de ${t.artists}` : "—", accent: true },
          { label: "Obras vendidas", value: t?.sold ?? 0 },
          { label: "Entregadas", value: t?.delivered ?? 0 },
          { label: "Por entregar", value: t?.pending ?? 0 },
          { label: "Devueltas", value: t?.returned ?? 0 },
        ]}
      />

      <Card>
        {isFetching && <LinearProgress />}
        <CardContent>
          {isLoading ? (
            <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell>Artista</TableCell>
                    <TableCell align="right">Vendidas</TableCell>
                    <TableCell align="right">Entregadas</TableCell>
                    <TableCell align="right">Por entregar</TableCell>
                    <TableCell>Avance</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Última entrega</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ color: "text.secondary", py: 3 }}>{data?.rows.length ? "Ningún artista con ese filtro." : "Todavía no hay obras vendidas."}</TableCell></TableRow>
                  ) : rows.map((r) => <ArtistRow key={r.artistId} r={r} />)}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
