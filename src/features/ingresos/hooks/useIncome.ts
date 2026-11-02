"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApplicationStats, listApplications, type ArtistApplication } from "@services/applications.service";
import { getConvocatorias } from "@services/events.service";
import { listOrders } from "@services/orders.service";
import { getTicketSales } from "@services/ticket.service";
import { appAmount, buildCustomers, orderIncome } from "../model/income";

const convocatoriaId = (c: any) => String(c._id || c.id);

/** Inscripciones pagadas de las convocatorias de esta feria (la API da 100 por página). */
async function paidApplications(eventId: string) {
  const convocatorias = await getConvocatorias(eventId);
  const docs: ArtistApplication[] = [];
  for (const c of convocatorias) {
    let page = 1;
    let pages = 1;
    do {
      const r = await listApplications({ convocatoria: convocatoriaId(c), isPaid: "true", limit: 100, page });
      docs.push(...r.docs);
      pages = r.totalPages || 1;
      page += 1;
    } while (page <= pages);
  }
  return docs;
}

/** Solicitudes recibidas y aceptadas en las convocatorias de esta feria. */
async function applicationCounts(eventId: string) {
  const convocatorias = await getConvocatorias(eventId);
  const stats = await Promise.all(convocatorias.map((c) => getApplicationStats(convocatoriaId(c))));
  return {
    total: stats.reduce((s, x) => s + (x.total || 0), 0),
    accepted: stats.reduce((s, x) => s + (x.byStatus?.accepted || 0), 0),
  };
}

/** Toda la plata de una feria y quién la pagó: una sola fuente para Tablero y Reportes. */
export function useIncome(eventId: string) {
  const ticketsQ = useQuery({ queryKey: ["income", "tickets", eventId], queryFn: () => getTicketSales(eventId) });
  const ordersQ = useQuery({ queryKey: ["income", "orders", eventId], queryFn: () => listOrders({ event: eventId }) });
  const appsQ = useQuery({ queryKey: ["income", "apps", eventId], queryFn: () => paidApplications(eventId) });
  const countsQ = useQuery({ queryKey: ["income", "appCounts", eventId], queryFn: () => applicationCounts(eventId) });
  const queries = [ticketsQ, ordersQ, appsQ, countsQ];

  const tickets = useMemo(() => ticketsQ.data ?? [], [ticketsQ.data]);
  const orders = useMemo(() => (ordersQ.data ?? []).filter((o) => orderIncome(o) > 0), [ordersQ.data]);
  const apps = useMemo(() => appsQ.data ?? [], [appsQ.data]);
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
    applications: countsQ.data ?? { total: 0, accepted: 0 },
    loading: queries.some((q) => q.isLoading),
    failed: queries.some((q) => q.isError),
    refetch: () => queries.forEach((q) => q.refetch()),
  };
}
