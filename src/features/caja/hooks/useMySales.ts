"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSalesReport } from "@services/orders.service";

export const todayBogota = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

/** Lo que cobró la cajera en sesión un día dado, con totales por método. */
export function useMySales(eventId: string | undefined, day: string) {
  const query = useQuery({
    queryKey: ["caja", "my-sales", eventId, day],
    queryFn: () => getSalesReport({ event: eventId, from: day, to: day, mine: 1 }),
    enabled: !!eventId && !!day,
    refetchInterval: 60_000,
  });

  const byMethod = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const l of query.data?.lines ?? []) acc[l.method] = (acc[l.method] ?? 0) + l.amount;
    return acc;
  }, [query.data]);

  return { ...query, byMethod };
}
