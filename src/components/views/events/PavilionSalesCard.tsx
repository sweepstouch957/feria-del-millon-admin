"use client";

import * as React from "react";
import {
  Card, CardHeader, CardContent, Typography, Button, Box, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { getSalesReport } from "@services/orders.service";
import { formatCOP } from "@/utils/money";

/* Ventas por pabellón del evento seleccionado: es la métrica que justifica
   crear un pabellón por convocatoria. El detalle fino vive en /reportes/ventas. */

const money = (n?: number) => formatCOP(n, { code: true });

export default function PavilionSalesCard({
  eventId,
  highlightPavilionId,
}: {
  eventId: string;
  highlightPavilionId?: string | null;
}) {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "sales", { event: eventId }],
    queryFn: () => getSalesReport({ event: eventId }),
    enabled: !!eventId,
    staleTime: 60_000,
  });

  const rows = data?.byPavilion || [];

  return (
    <Card variant="outlined" sx={{ borderRadius: 0, mt: 2 }}>
      <CardHeader
        title="Ventas por pabellón"
        subheader={
          data
            ? `${data.units} obras vendidas · ${money(data.total)} en total`
            : "Obras pagadas de este evento"
        }
        action={
          <Button size="small" startIcon={<BarChart3 size={14} />} onClick={() => router.push("/reportes/ventas")}>
            Ver informe
          </Button>
        }
        sx={{ pb: 0 }}
      />
      <CardContent>
        {isLoading ? (
          <Box sx={{ p: 3, textAlign: "center" }}><CircularProgress size={22} /></Box>
        ) : rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Todavía no hay ventas pagadas en este evento.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Pabellón</TableCell>
                <TableCell align="right">Obras</TableCell>
                <TableCell align="right">Caja</TableCell>
                <TableCell align="right">En línea</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key} selected={!!highlightPavilionId && r.key === highlightPavilionId} hover>
                  <TableCell>{r.label}</TableCell>
                  <TableCell align="right">{r.units}</TableCell>
                  <TableCell align="right">{money(r.caja)}</TableCell>
                  <TableCell align="right">{money(r.online)}</TableCell>
                  <TableCell align="right"><b>{money(r.amount)}</b></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
