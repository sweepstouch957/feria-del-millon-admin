"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApplicationStats, listApplications, type ArtistApplication } from "@services/applications.service";
import { getConvocatorias } from "@services/events.service";
import { listOrders } from "@services/orders.service";
import { getTicketSales } from "@services/ticket.service";
import { appAmount, buildCustomers, fairConvocatorias, isCollected, orderIncome } from "../model/income";

const convocatoriaId = (c: any) => String(c._id || c.id);

/** Inscripciones marcadas como pagadas en las convocatorias de esta feria. */
async function paidApplications(convocatorias: any[]) {
  // Una petición liviana por convocatoria (lite: solo campos de plata, hasta 2000).
  // Si el servidor aún no tiene lite (tope 100), se piden las páginas que falten.
  const perConv = await Promise.all(
    convocatorias.map(async (c) => {
      const q = { convocatoria: convocatoriaId(c), isPaid: "true", lite: "1" as const, limit: 2000 };
      const first = await listApplications({ ...q, page: 1 });
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, (first.totalPages || 1) - 1) }, (_, i) => listApplications({ ...q, page: i + 2 })),
      );
      return [first, ...rest].flatMap((r) => r.docs as ArtistApplication[]);
    }),
  );
  return perConv.flat();
}

/** Solicitudes de las convocatorias de esta feria, en total y por estado. */
async function applicationCounts(convocatorias: any[]) {
  const stats = await Promise.all(convocatorias.map((c) => getApplicationStats(convocatoriaId(c))));
  const byStatus: Record<string, number> = {};
  for (const s of stats) {
    for (const [k, n] of Object.entries(s.byStatus || {})) byStatus[k] = (byStatus[k] || 0) + (n || 0);
  }
  return {
    total: stats.reduce((s, x) => s + (x.total || 0), 0),
    accepted: byStatus.accepted || 0,
    byStatus,
  };
}

/** Toda la plata de una feria y quién la pagó: una sola fuente para Tablero y Reportes. */
export function useIncome(eventId: string) {
  // 1 min de caché: ir y volver entre Tablero y Reportes no vuelve a pedir todo.
  const staleTime = 60_000;
  const ticketsQ = useQuery({ queryKey: ["income", "tickets", eventId], queryFn: () => getTicketSales(eventId), staleTime });
  const ordersQ = useQuery({ queryKey: ["income", "orders", eventId], queryFn: () => listOrders({ event: eventId }), staleTime });
  // Convocatorias una sola vez; inscripciones y conteos salen de ahí.
  const convQ = useQuery({ queryKey: ["income", "convocatorias", eventId], queryFn: async () => fairConvocatorias(await getConvocatorias(), eventId), staleTime });
  const convs = convQ.data;
  const appsQ = useQuery({ queryKey: ["income", "apps", eventId], queryFn: () => paidApplications(convs!), enabled: !!convs, staleTime });
  const countsQ = useQuery({ queryKey: ["income", "appCounts", eventId], queryFn: () => applicationCounts(convs!), enabled: !!convs, staleTime });
  const queries = [ticketsQ, ordersQ, convQ, appsQ, countsQ];

  const tickets = useMemo(() => ticketsQ.data ?? [], [ticketsQ.data]);
  const orders = useMemo(() => (ordersQ.data ?? []).filter((o) => orderIncome(o) > 0), [ordersQ.data]);
  const apps = useMemo(() => (appsQ.data ?? []).filter(isCollected), [appsQ.data]);
  const customers = useMemo(() => buildCustomers(tickets, orders), [tickets, orders]);

  const ticketsTotal = tickets.reduce((s, t) => s + Number(t.price || 0), 0);
  const ordersTotal = orders.reduce((s, o) => s + orderIncome(o), 0);
  const appsTotal = apps.reduce((s, a) => s + appAmount(a), 0);

  return {
    tickets,
    orders,
    apps,
    customers,
    ticketsTotal,
    ordersTotal,
    appsTotal,
    total: ticketsTotal + ordersTotal + appsTotal,
    /** Lo que falta por cobrar de las obras apartadas. */
    pending: orders.reduce((s, o) => s + (o.status === "partial" ? Number(o.layaway?.balanceDue || 0) : 0), 0),
    applications: countsQ.data ?? { total: 0, accepted: 0, byStatus: {} as Record<string, number> },
    loading: queries.some((q) => q.isLoading),
    /** Por fuente: así una consulta lenta no deja en gris las demás cifras. */
    loadingBy: {
      apps: convQ.isLoading || appsQ.isLoading,
      orders: ordersQ.isLoading,
      tickets: ticketsQ.isLoading,
      counts: convQ.isLoading || countsQ.isLoading,
    },
    failed: queries.some((q) => q.isError),
    refetch: () => queries.forEach((q) => q.refetch()),
  };
}
