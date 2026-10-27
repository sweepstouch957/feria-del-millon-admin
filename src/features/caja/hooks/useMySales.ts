"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSalesReport, type SalesReport } from "@services/orders.service";
import { listPracticeSales } from "../model/practice";
import { useCajaAccess } from "./useCajaAccess";

export const todayBogota = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

/** Cierre armado con las ventas de práctica del navegador (mismo formato que el real). */
function practiceReport(day: string): SalesReport {
  const lines = listPracticeSales().filter((l) => l.day === day);
  return {
    total: lines.reduce((a, l) => a + l.amount, 0),
    units: lines.reduce((a, l) => a + l.qty, 0),
    orders: lines.length,
    byDay: [], byPavilion: [], byArtist: [], byTechnique: [],
    lines,
  };
}

/** Lo que cobró la cajera en sesión un día dado, con totales por método. */
export function useMySales(eventId: string | undefined, day: string) {
  const { practice } = useCajaAccess();
  const query = useQuery({
    queryKey: ["caja", "my-sales", eventId, day, practice],
    queryFn: () => (practice ? practiceReport(day) : getSalesReport({ event: eventId, from: day, to: day, mine: 1 })),
    enabled: !!eventId && !!day,
    refetchInterval: practice ? false : 60_000,
  });

  const byMethod = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const l of query.data?.lines ?? []) acc[l.method] = (acc[l.method] ?? 0) + l.amount;
    return acc;
  }, [query.data]);

  return { ...query, byMethod };
}
