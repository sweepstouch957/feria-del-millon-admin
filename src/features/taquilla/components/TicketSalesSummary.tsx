"use client";

import { memo, useMemo, useState } from "react";
import { Box, Button, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { CorrectionDialog, type CorrectionTarget } from "@features/correcciones/components/CorrectionDialog";
import { ticketPayments, ticketsByMethod } from "@features/ingresos/model/income";
import type { TicketSale } from "@services/ticket.service";
import { useQuery } from "@tanstack/react-query";
import KpiStrip from "@/components/ui/KpiStrip";
import { eyebrow } from "@/app/theme";
import { getTicketSales } from "@services/ticket.service";
import { formatCOP } from "@/utils/money";
import { useAuth } from "@/provider/authProvider";
import { SALES_DETAIL_ENABLED } from "@/utils/exportsLock";

const colombiaDay = (d: string | Date) => new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

/**
 * Cuántas entradas y cuánta plata van, por método de pago (taquilla y en línea).
 * memo: cambiar la cantidad o el tipo en el formulario no lo vuelve a pintar.
 */
export const TicketSalesSummary = memo(function TicketSalesSummaryGate({ eventId }: { eventId: string }) {
  // Bloqueo (utils/exportsLock): en vez del resumen, un error del sistema.
  if (!SALES_DETAIL_ENABLED) {
    return (
      <Box sx={{ border: "1px solid", borderColor: "divider", p: 3, mt: 3, textAlign: "center" }}>
        <Typography fontWeight={500}>No pudimos cargar el resumen de ventas</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Ocurrió un error en el sistema. Intenta de nuevo más tarde.</Typography>
      </Box>
    );
  }
  return <SalesSummary eventId={eventId} />;
});

function SalesSummary({ eventId }: { eventId: string }) {
  const [range, setRange] = useState<"today" | "all">("today");
  // Taquilla recibe solo sus ventas (lo filtra el servidor); administración, todas.
  const roles = (useAuth().user?.roles || {}) as Record<string, boolean | undefined>;
  const mine = !(roles.superuser || roles.staff || roles.curador);
  const { data = [], isLoading } = useQuery({
    queryKey: ["ticketSales", eventId],
    queryFn: () => getTicketSales(eventId),
    refetchInterval: 60_000,
  });

  const rows = useMemo(() => {
    const today = colombiaDay(new Date());
    return range === "all" ? data : data.filter((t) => colombiaDay(t.createdAt) === today);
  }, [data, range]);
  const total = rows.reduce((s, t) => s + Number(t.price || 0), 0);
  const [fix, setFix] = useState<CorrectionTarget | null>(null);
  // Una compra = entradas del mismo comprador en el mismo momento (como las registra la taquilla).
  const purchases = useMemo(() => {
    if (!mine) return [];
    const map = new Map<string, TicketSale[]>();
    for (const t of rows) {
      if (t.saleChannel !== "onsite") continue;
      const k = `${t.createdAt}|${t.buyer?.email}`;
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    return [...map.values()];
  }, [rows, mine]);

  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
        <Typography sx={{ ...eyebrow, fontSize: 10, color: "text.secondary" }}>{mine ? "Tus ventas" : "Entradas vendidas"}</Typography>
        <ToggleButtonGroup aria-label="Periodo" exclusive size="small" value={range} onChange={(_, v) => v && setRange(v)}>
          <ToggleButton value="today" sx={{ textTransform: "none", minHeight: 40 }}>Hoy</ToggleButton>
          <ToggleButton value="all" sx={{ textTransform: "none", minHeight: 40 }}>{mine ? "Todos los días" : "Toda la feria"}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <KpiStrip
        loading={isLoading}
        items={[
          { label: "Total", value: formatCOP(total, { code: true }), sub: `${rows.length} entrada(s)`, accent: true },
          ...ticketsByMethod(rows).map((m) => ({
            label: m.label,
            value: formatCOP(m.amount, { code: true }),
            sub: `${m.count} pago(s)`,
          })),
        ]}
      />
      {purchases.length > 0 && (
        <Stack sx={{ mt: 2 }} divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
          {purchases.map((g) => {
            const t = g[0];
            const split = ticketsByMethod(g); // etiquetas, para mostrar
            const parts = g.flatMap(ticketPayments).reduce<Record<string, number>>((m, p) => {
              if (p.method && p.amount > 0) m[p.method] = (m[p.method] ?? 0) + p.amount;
              return m;
            }, {});
            const time = new Date(t.createdAt).toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" });
            return (
              <Box key={t.id} sx={{ py: 1, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap>{t.buyer?.name || t.buyer?.email}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {time} · {g.length} entrada(s) · {split.map((m) => (split.length > 1 ? `${m.label} ${formatCOP(m.amount)}` : m.label)).join(" + ")}
                  </Typography>
                </Box>
                <Typography sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatCOP(g.reduce((s, x) => s + Number(x.price || 0), 0))}
                </Typography>
                <Button
                  size="small"
                  onClick={() =>
                    setFix({
                      kind: "ticket",
                      id: t.id,
                      title: `${g.length} entrada(s) · ${t.buyer?.name || t.buyer?.email} · ${time}`,
                      split: Object.entries(parts).map(([method, amount]) => ({ method, amount })),
                      email: t.buyer?.email || "",
                      price: Number(g.find((x) => Number(x.price) > 0)?.price ?? t.price ?? 0),
                    })
                  }
                >
                  Corregir
                </Button>
              </Box>
            );
          })}
        </Stack>
      )}
      <CorrectionDialog target={fix} onClose={() => setFix(null)} />
    </Box>
  );
}
