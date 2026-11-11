"use client";

import { useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { formatCOP } from "@/utils/money";
import { downloadCsv, stamp, toCsv } from "@/utils/csv";
import { todayBogota, useMySales } from "../hooks/useMySales";
import { CAJA_METHODS, METHOD_LABEL } from "../model/sale";
import type { SalesLine } from "@services/orders.service";
import { CorrectionDialog, type CorrectionTarget } from "@features/correcciones/components/CorrectionDialog";

/** Cómo se pagó un pedido: sus líneas (una por obra y método) sumadas por método. */
const orderTarget = (lines: SalesLine[], orderId: string) => {
  const map = new Map<string, number>();
  for (const l of lines) if (l.orderId === orderId) map.set(l.method, (map.get(l.method) ?? 0) + l.amount);
  const split = [...map].map(([method, amount]) => ({ method, amount }));
  return { split, price: split.reduce((s, p) => s + p.amount, 0) };
};

/** Cierre de caja: lo que cobró la cajera en sesión, para cuadrar al final del día. */
export function MySalesPage() {
  const { eventId, isLoading, isError, refetch } = useActiveEvent();
  const [day, setDay] = useState(todayBogota);
  const sales = useMySales(eventId ?? undefined, day);
  const [fix, setFix] = useState<CorrectionTarget | null>(null);
  if (!eventId) return <ActiveEventGate isLoading={isLoading} isError={isError} onRetry={refetch} />;

  const lines = sales.data?.lines ?? [];
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
          { label: "Descargar Excel", export: true, kind: "sec", onClick: exportCsv, disabled: !lines.length },
        ]}
      >
        <TextField type="date" size="small" label="Día" value={day} onChange={(e) => setDay(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </PageHeader>

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
          <Box key={`${l.orderId}-${i}`} sx={{ py: 1.25, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap>{l.artwork}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {[l.artist, l.buyer, l.method in METHOD_LABEL ? "" : l.method].filter(Boolean).join(" · ")}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">{METHOD_LABEL[l.method] ?? ""}</Typography>
            <Typography sx={{ fontVariantNumeric: "tabular-nums" }}>{formatCOP(l.amount)}</Typography>
            {/* Venta en lote: corregir una línea corrige todo el pedido. Pagos en línea no se corrigen. */}
            {l.method in METHOD_LABEL && (
              <Button
                size="small"
                onClick={() => setFix({ kind: "order", id: l.orderId, title: `${l.artwork} · ${l.buyer}`, email: l.buyerEmail, ...orderTarget(lines, l.orderId) })}
              >
                Corregir
              </Button>
            )}
          </Box>
        ))}
      </Stack>
      {!sales.isLoading && !lines.length && (
        <Typography color="text.secondary" sx={{ py: 3 }}>No registraste ventas este día.</Typography>
      )}
      <CorrectionDialog target={fix} onClose={() => setFix(null)} />
    </Box>
  );
}
