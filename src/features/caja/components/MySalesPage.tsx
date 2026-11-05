"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { formatCOP } from "@/utils/money";
import { downloadCsv, stamp, toCsv } from "@/utils/csv";
import { todayBogota, useMySales } from "../hooks/useMySales";
import { CAJA_METHODS, METHOD_LABEL } from "../model/sale";
import { clearPracticeSales, listPracticeSales } from "../model/practice";
import type { SalesLine } from "@services/orders.service";
import { useCajaAccess } from "../hooks/useCajaAccess";
import { PracticeBanner } from "./PracticeBanner";

/** Cierre de caja: lo que cobró la cajera en sesión, para cuadrar al final del día. */
export function MySalesPage() {
  const { eventId, isLoading, isError, refetch } = useActiveEvent();
  const [day, setDay] = useState(todayBogota);
  const sales = useMySales(eventId ?? undefined, day);
  const { practice } = useCajaAccess();
  const [unsaved, setUnsaved] = useState<SalesLine[]>([]);
  useEffect(() => setUnsaved(listPracticeSales()), []);
  if (!eventId) return <ActiveEventGate isLoading={isLoading} isError={isError} onRetry={refetch} />;

  const lines = sales.data?.lines ?? [];
  // Ventas hechas en modo práctica: quedaron solo en este navegador, NO en el
  // sistema. Hay que volver a registrarlas en caja (sin cobrar otra vez).
  const exportCsv = () => toExcel(`mi_cierre_${day}_${stamp()}.csv`, lines);
  const toExcel = (name: string, rows: SalesLine[]) =>
    downloadCsv(name, toCsv(rows, [
      { header: "Día", value: (l) => l.day },
      { header: "Pedido", value: (l) => l.orderId, text: true },
      { header: "Obra", value: (l) => l.artwork },
      { header: "Artista", value: (l) => l.artist },
      { header: "Técnica", value: (l) => l.technique },
      { header: "Pabellón", value: (l) => l.pavilion },
      { header: "Cantidad", value: (l) => l.qty },
      { header: "Valor (COP)", value: (l) => l.amount },
      { header: "Método", value: (l) => METHOD_LABEL[l.method] ?? l.method },
      { header: "Comprador", value: (l) => l.buyer },
      { header: "Correo", value: (l) => l.buyerEmail },
      { header: "Teléfono", value: (l) => l.buyerPhone, text: true },
    ]));

  return (
    <Box sx={{ maxWidth: 980, mx: "auto" }}>
      <PageHeader
        crumb="Caja"
        title="Mi cierre del día"
        description="Ventas pagadas que registraste tú. Cuadra el efectivo y los vouchers con estas cifras."
        back="/caja"
        backLabel="Volver a la caja"
        actions={[
          { label: "Descargar Excel", kind: "sec", onClick: exportCsv, disabled: !lines.length },
          ...(practice ? [{ label: "Borrar ventas de práctica", kind: "sec" as const, onClick: () => { clearPracticeSales(); void sales.refetch(); } }] : []),
        ]}
      >
        <TextField type="date" size="small" label="Día" value={day} onChange={(e) => setDay(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </PageHeader>
      <PracticeBanner />

      {unsaved.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography fontWeight={600}>
            {unsaved.length} venta(s) hechas en modo práctica NO se guardaron en el sistema
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            No bajaron stock ni salen en reportes. Vuelve a registrar cada una en la caja con los mismos datos
            (si ya se pasó el datáfono, no cobres otra vez: usa el voucher). Descarga la lista antes de borrar datos del navegador.
          </Typography>
          <Stack sx={{ mt: 1.5 }} divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
            {unsaved.map((l, i) => (
              <Box key={`${l.orderId}-${i}`} sx={{ py: 0.75 }}>
                <Typography variant="body2" fontWeight={500}>
                  {l.day} · {l.artwork} · {l.artist} · {formatCOP(l.amount)} · {METHOD_LABEL[l.method] ?? l.method}
                </Typography>
                <Typography variant="body2">
                  {[l.buyer, l.buyerEmail, l.buyerPhone].filter(Boolean).join(" · ")}
                </Typography>
              </Box>
            ))}
          </Stack>
          <Button size="small" variant="contained" color="error" sx={{ mt: 1.5 }}
            onClick={() => toExcel(`ventas_NO_guardadas_${stamp()}.csv`, unsaved)}>
            Descargar Excel
          </Button>
        </Alert>
      )}

      <KpiStrip
        loading={sales.isLoading}
        min={140}
        items={[
          { label: "Total", value: formatCOP(sales.data?.total), accent: true, sub: `${sales.data?.units ?? 0} obra(s)` },
          ...CAJA_METHODS.map((m) => ({ label: m.label, value: formatCOP(sales.byMethod[m.value] ?? 0) })),
        ]}
      />

      <Stack divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
        {lines.map((l, i) => (
          <Box key={`${l.orderId}-${i}`} sx={{ py: 1.25, display: "flex", gap: 2, alignItems: "baseline" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap>{l.artwork}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {[l.artist, l.buyer, METHOD_LABEL[l.method] ?? l.method].filter(Boolean).join(" · ")}
              </Typography>
            </Box>
            <Typography sx={{ fontVariantNumeric: "tabular-nums" }}>{formatCOP(l.amount)}</Typography>
          </Box>
        ))}
      </Stack>
      {!sales.isLoading && !lines.length && (
        <Typography color="text.secondary" sx={{ py: 3 }}>No registraste ventas este día.</Typography>
      )}
    </Box>
  );
}
