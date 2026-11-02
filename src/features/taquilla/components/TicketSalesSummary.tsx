"use client";

import { useMemo, useState } from "react";
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import KpiStrip from "@/components/ui/KpiStrip";
import { eyebrow } from "@/app/theme";
import { byMethod } from "@features/ingresos/model/income";
import { getTicketSales } from "@services/ticket.service";
import { formatCOP } from "@/utils/money";

const colombiaDay = (d: string | Date) => new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

/** Cuántas entradas y cuánta plata van, por método de pago (taquilla y en línea). */
export function TicketSalesSummary({ eventId }: { eventId: string }) {
  const [range, setRange] = useState<"today" | "all">("today");
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

  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
        <Typography sx={{ ...eyebrow, fontSize: 10, color: "text.secondary" }}>Entradas vendidas</Typography>
        <ToggleButtonGroup exclusive size="small" value={range} onChange={(_, v) => v && setRange(v)}>
          <ToggleButton value="today" sx={{ textTransform: "none" }}>Hoy</ToggleButton>
          <ToggleButton value="all" sx={{ textTransform: "none" }}>Toda la feria</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <KpiStrip
        loading={isLoading}
        items={[
          { label: "Total", value: formatCOP(total, { code: true }), sub: `${rows.length} entrada(s)`, accent: true },
          ...byMethod(rows, (t) => t.paymentMethod, (t) => Number(t.price || 0)).map((m) => ({
            label: m.label,
            value: formatCOP(m.amount, { code: true }),
            sub: `${m.count} entrada(s)`,
          })),
        ]}
      />
    </Box>
  );
}
