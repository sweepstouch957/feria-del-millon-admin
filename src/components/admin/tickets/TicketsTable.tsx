"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { RefreshCw, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import ResponsiveRows from "@/components/common/ResponsiveRows";
import { formatCOP } from "@/utils/money";
import { eyebrow } from "@/app/theme";
import { getTickets, type Ticket } from "@services/ticket.service";

const STATUS: Record<string, { label: string; color: "primary" | "success" | "warning" | "default" }> = {
  sold: { label: "Vendido", color: "primary" },
  checked_in: { label: "Ingresó", color: "success" },
  refunded: { label: "Reembolsado", color: "warning" },
  cancelled: { label: "Cancelado", color: "default" },
};
const statusOf = (s: string) => STATUS[s] ?? STATUS.cancelled;

/** El día del boleto viene a medianoche UTC: se muestra ese día, no el anterior. */
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const code = (t: Ticket) => t.shortCode ?? String(t.id).slice(-6);

export function TicketsTable({ eventId }: { eventId: string }) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["tickets", eventId],
    queryFn: () => getTickets({ eventId, limit: 200 }),
  });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const dq = useDeferredValue(q.trim().toLowerCase());

  const tickets: Ticket[] = data?.data ?? [];
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of tickets) c[t.status] = (c[t.status] || 0) + 1;
    return c;
  }, [tickets]);
  const rows = useMemo(
    () =>
      tickets.filter(
        (t) =>
          (status === "all" || t.status === status) &&
          (!dq || [code(t), t.buyer?.name, t.buyer?.email].some((v) => String(v || "").toLowerCase().includes(dq))),
      ),
    [tickets, status, dq],
  );

  const chip = (t: Ticket) => {
    const s = statusOf(t.status);
    return <Chip size="small" label={s.label} color={s.color} variant={s.color === "default" ? "outlined" : "filled"} />;
  };

  return (
    <Card>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "flex-end" }}
        gap={2}
        sx={{ p: { xs: 2, md: 3 }, pb: 2 }}
      >
        <Box>
          <Typography sx={{ ...eyebrow, color: "primary.main" }}>Ventas</Typography>
          <Typography variant="h5" sx={{ mt: 0.5 }}>Boletos emitidos</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Los últimos {tickets.length ? tickets.length.toLocaleString("es-CO") : ""} boletos de esta feria.
          </Typography>
        </Box>
        <Stack direction="row" gap={1} alignItems="center">
          <TextField
            size="small"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Código, nombre o correo"
            sx={{ flex: 1, minWidth: { md: 260 } }}
            slotProps={{
              htmlInput: { "aria-label": "Buscar boleto" },
              input: { startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> },
            }}
          />
          <Tooltip title="Recargar">
            <span>
              <IconButton onClick={() => refetch()} disabled={isFetching} sx={{ border: 1, borderColor: "divider" }}>
                {isFetching ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <Box sx={{ px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 } }}>
        {tickets.length > 0 && (
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
            {[["all", "Todos", tickets.length] as const, ...Object.entries(STATUS).map(([k, s]) => [k, s.label, counts[k] || 0] as const)].map(
              ([k, label, n]) => (
                <Chip
                  key={k}
                  label={`${label} · ${n}`}
                  onClick={() => setStatus(k)}
                  color={status === k ? "primary" : "default"}
                  variant={status === k ? "filled" : "outlined"}
                  disabled={!n && k !== "all"}
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                />
              ),
            )}
          </Stack>
        )}

        {isLoading && <Stack gap={1}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={40} />)}</Stack>}
        {isError && (
          <Alert severity="error" action={<Button onClick={() => refetch()}>Reintentar</Button>}>
            No se pudieron cargar los boletos.
          </Alert>
        )}
        {!isLoading && !isError && tickets.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            Aún no hay boletos para esta feria.
          </Typography>
        )}
        {tickets.length > 0 && rows.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            Ningún boleto coincide con la búsqueda.
          </Typography>
        )}

        {rows.length > 0 && (
          <ResponsiveRows
            emptyText="No hay boletos."
            cards={rows.map((t) => ({
              id: String(t.id),
              title: t.buyer?.name || "Comprador",
              subtitle: t.buyer?.email,
              badge: chip(t),
              fields: [
                { label: "Código", value: code(t) },
                { label: "Día", value: fmtDay(t.eventDay) },
                { label: "Precio", value: formatCOP(t.price, { currency: t.currency || "COP" }) },
              ],
            }))}
          >
            <Box sx={{ maxHeight: 520, overflow: "auto", border: 1, borderColor: "divider" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Comprador</TableCell>
                    <TableCell>Día</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Precio</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell sx={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13 }}>{code(t)}</TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Typography variant="body2" noWrap>{t.buyer?.name || "—"}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block">{t.buyer?.email}</Typography>
                      </TableCell>
                      <TableCell sx={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>{fmtDay(t.eventDay)}</TableCell>
                      <TableCell>{chip(t)}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        {formatCOP(t.price, { currency: t.currency || "COP" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </ResponsiveRows>
        )}
      </Box>
    </Card>
  );
}
