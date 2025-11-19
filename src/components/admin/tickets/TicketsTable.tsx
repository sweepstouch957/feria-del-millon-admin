"use client";

import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Box,
} from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import { getTickets, type Ticket } from "@services/ticket.service";

export function TicketsTable({ eventId }: { eventId: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["tickets", eventId],
    queryFn: () => getTickets({ eventId, limit: 200 }),
  });

  const tickets: Ticket[] = data?.data ?? [];

  return (
    <Card
      sx={{
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <CardHeader
        title="Boletos emitidos"
        subheader="Listado de los últimos boletos generados para este evento."
        action={
          <IconButton onClick={() => refetch()} size="small">
            <RefreshIcon fontSize="small" />
          </IconButton>
        }
      />
      <CardContent>
        {isLoading && <Typography>Cargando boletos…</Typography>}
        {isError && (
          <Alert severity="error">
            No se pudieron cargar los boletos. Intenta de nuevo.
          </Alert>
        )}
        {!isLoading && !isError && tickets.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Aún no hay boletos generados para este evento.
          </Typography>
        )}

        {tickets.length > 0 && (
          <Box sx={{ maxHeight: 360, overflow: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Comprador</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Precio</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.shortCode ?? t.id.slice(-6)}</TableCell>
                    <TableCell>{t.buyer?.name}</TableCell>
                    <TableCell>{t.buyer?.email}</TableCell>
                    <TableCell>
                      {new Date(t.eventDay).toISOString().slice(0, 10)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          t.status === "sold"
                            ? "Vendido"
                            : t.status === "checked_in"
                            ? "Check-in"
                            : t.status === "refunded"
                            ? "Reembolsado"
                            : "Cancelado"
                        }
                        color={
                          t.status === "sold"
                            ? "primary"
                            : t.status === "checked_in"
                            ? "success"
                            : t.status === "refunded"
                            ? "warning"
                            : "default"
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      {Intl.NumberFormat("es-CO", {
                        style: "currency",
                        currency: t.currency || "COP",
                        maximumFractionDigits: 0,
                      }).format(t.price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
