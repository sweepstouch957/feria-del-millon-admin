"use client";

import { useMemo } from "react";
import { Alert, Box, ButtonBase, Typography } from "@mui/material";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import KpiStrip from "@/components/ui/KpiStrip";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import { MeterList, MonthlyIncomeChart, Panel, SourceSplit, type MeterRow } from "@features/ingresos/components/DashboardCharts";
import ShopSalesCard from "@/components/views/events/ShopSalesCard";
import { useIncome } from "@features/ingresos/hooks/useIncome";
import { appAmount, monthlyIncome, orderIncome } from "@features/ingresos/model/income";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { getInvitationsAdmin, listInviteLinks } from "@/services/ticket.service";
import { listUsers } from "@/services/user.service";
import { formatCOP } from "@/utils/money";
import { SALES_DETAIL_ENABLED } from "@/utils/exportsLock";

const money = (n: number) => formatCOP(n, { code: true });
const percent = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)} %` : "0 %");

const STATUS_LABELS: Record<string, string> = {
  accepted: "Aceptadas",
  rejected: "Rechazadas",
  submitted: "Enviadas",
  under_review: "En revisión",
  stand_by: "Stand by",
  revision_requested: "Corrección solicitada",
  draft: "Borrador",
  pending_payment: "Pago pendiente",
};

/* Lo que más se busca, con una línea que dice qué hay adentro: así nadie
   tiene que adivinar en qué parte del menú vive cada cosa. */
const SHORTCUTS: { title: string; hint: string; href: string }[] = [
  { title: "Editar el sitio web", hint: "Portada, textos, menú, convocatoria y venta en línea del catálogo.", href: "/personalizacion" },
  { title: "Revisar postulaciones", hint: "Califica, revisa el pago de inscripción y acepta artistas.", href: "/solicitudes" },
  { title: "Inventario de obras", hint: "Precio, stock, visibilidad en el catálogo y venta en lote.", href: "/inventory/artworks" },
  { title: "¿Quién no ha cargado obras?", hint: "Artistas con el estudio en borrador o sin darle Enviar.", href: "/inventory/carga" },
  { title: "Invitar a la feria", hint: "Invitados con pase QR, enlaces por empresa y recordatorios.", href: "/tickets/invitaciones" },
  { title: "Crear cuentas", hint: "Cajeras, equipo y artistas invitados, con clave generada.", href: "/users" },
  { title: "Etiquetas QR de obras", hint: "Hojas listas para imprimir y pegar en cada obra.", href: "/inventory/artworks/qr" },
  { title: "Reportes y cierres", hint: "Ventas por día y método de pago, con Excel para contabilidad.", href: "/reportes" },
];

function QuickActions() {
  const router = useRouter();
  return (
    <Box sx={{ mb: { xs: 2, md: 3 } }}>
      <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "text.secondary", mb: 1 }}>
        Accesos rápidos
      </Typography>
      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" } }}>
        {SHORTCUTS.map((s) => (
          <ButtonBase
            key={s.href}
            onClick={() => router.push(s.href)}
            sx={{
              p: 1.5, textAlign: "left", alignItems: "flex-start", flexDirection: "column", gap: 0.5,
              border: "1px solid", borderColor: "divider", bgcolor: "background.paper",
              transition: "border-color .15s ease",
              "&:hover": { borderColor: "text.primary" },
              "&:hover .qa-arrow": { opacity: 1, transform: "none" },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, width: "100%" }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{s.title}</Typography>
              <Box className="qa-arrow" sx={{ display: "flex", opacity: 0.35, transform: "translateX(-3px)", transition: "all .15s ease" }}>
                <ArrowRight size={14} />
              </Box>
            </Box>
            <Typography sx={{ fontSize: 12, color: "text.secondary", lineHeight: 1.45 }}>{s.hint}</Typography>
          </ButtonBase>
        ))}
      </Box>
    </Box>
  );
}

/** Tablero: las cifras de un vistazo. El detalle de cada una vive en Reportes. */
export default function HomeClient() {
  const { eventId, isLoading, isError, refetch } = useActiveEvent();
  if (!eventId) return <ActiveEventGate isLoading={isLoading} isError={isError} onRetry={refetch} />;
  return <Dashboard eventId={eventId} />;
}

function Dashboard({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { event } = useActiveEvent();
  const income = useIncome(eventId);
  const { data: artists } = useQuery({
    queryKey: ["dash", "users", "artists"],
    queryFn: () => listUsers({ roles: ["artista"], limit: 1 }),
    staleTime: 60_000,
  });
  const invitesQ = useQuery({
    queryKey: ["dash", "invitations", eventId],
    queryFn: () => getInvitationsAdmin({ eventId, limit: 10 }),
    staleTime: 60_000,
  });
  const linksQ = useQuery({
    queryKey: ["dash", "invite-links", eventId],
    queryFn: () => listInviteLinks(eventId),
    staleTime: 60_000,
  });

  const months = useMemo(
    () =>
      monthlyIncome([
        ...income.apps.map((a) => ({ at: a.paidAt || a.createdAt, source: "apps" as const, amount: appAmount(a) })),
        ...income.orders.map((o) => ({ at: o.paidAt || o.createdAt, source: "orders" as const, amount: orderIncome(o) })),
        ...income.tickets.map((t) => ({ at: t.createdAt, source: "tickets" as const, amount: Number(t.price || 0) })),
      ]),
    [income.apps, income.orders, income.tickets],
  );
  const totals = { apps: income.appsTotal, orders: income.ordersTotal, tickets: income.ticketsTotal };

  const inv = invitesQ.data?.stats;
  const invited = inv?.sent ?? 0;
  const inviteRows: MeterRow[] = inv
    ? [
        { label: "Confirmadas", value: inv.confirmed, of: invited },
        { label: "Sin responder", value: inv.pending, of: invited, muted: true },
        { label: "Rechazadas", value: inv.declined, of: invited, muted: true },
        { label: "Ya ingresaron a la feria", value: inv.attended, of: invited },
      ]
    : [];

  const applicationRows: MeterRow[] = Object.entries(income.applications.byStatus)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([status, n]) => ({
      label: STATUS_LABELS[status] || status,
      value: n,
      of: income.applications.total,
      muted: status !== "accepted",
    }));

  const links = linksQ.data ?? [];
  const linkRows: MeterRow[] = [...links]
    .sort((a, b) => b.uses / (b.maxUses || 1) - a.uses / (a.maxUses || 1))
    .map((l) => ({ label: l.label || l.code, value: l.uses, of: l.maxUses, text: `${l.uses} / ${l.maxUses}` }));
  const linkUses = links.reduce((s, l) => s + l.uses, 0);
  const linkSeats = links.reduce((s, l) => s + l.maxUses, 0);

  return (
    <Box>
      <PageHeader
        crumb="General"
        title="Tablero"
        badge={!income.loading ? <StatusPill label="En vivo" tone="ok" dot /> : undefined}
        description="Feria activa. Toca una cifra para ver todo su detalle."
        actions={[
          { label: "Guía del panel", kind: "sec", href: "/guia" },
          { label: "Ver todos los reportes", kind: "pri", href: "/reportes" },
        ]}
      />
      {(income.failed || invitesQ.isError || linksQ.isError) && (
        <Alert severity="error" sx={{ mb: 2 }}>Una parte no cargó: las cifras pueden estar incompletas.</Alert>
      )}

      <KpiStrip
        items={[
          { label: "Ingresos", loading: income.loading, value: money(income.total), accent: true, sub: "inscripciones + obras + boletos", onClick: () => router.push("/reportes") },
          { label: "Inscripciones", loading: income.loadingBy.apps, value: money(income.appsTotal), sub: income.loadingBy.apps ? "cargando…" : `${income.apps.length} pagada(s)`, hint: "Solo cobros aprobados por la pasarela o registrados a mano.", onClick: () => router.push("/reportes?ver=inscripciones") },
          { label: "Obras", loading: income.loadingBy.orders, value: money(income.ordersTotal), sub: `${income.orders.length} venta(s)`, onClick: () => router.push("/reportes?ver=obras") },
          { label: "Boletos", loading: income.loadingBy.tickets, value: money(income.ticketsTotal), sub: `${income.tickets.length} entrada(s)`, onClick: () => router.push("/reportes?ver=boletos") },
        ]}
        min={210}
      />
      <KpiStrip
        items={[
          { label: "Invitaciones aceptadas", loading: invitesQ.isLoading, value: inv?.confirmed ?? 0, sub: `${percent(inv?.confirmed ?? 0, invited)} de ${invited} · +${inv?.companions ?? 0} acompañantes`, onClick: () => router.push("/tickets/invitaciones") },
          { label: "Solicitudes", loading: income.loadingBy.counts, value: income.applications.total, sub: `${income.applications.accepted} aceptadas (${percent(income.applications.accepted, income.applications.total)})`, onClick: () => router.push("/solicitudes") },
          { label: "Clientes", loading: income.loadingBy.orders || income.loadingBy.tickets, value: income.customers.length, sub: "compraron entradas u obras", onClick: () => router.push("/reportes?ver=clientes") },
          { label: "Artistas", loading: !artists, value: artists?.total ?? 0, sub: "con cuenta", onClick: () => router.push("/users") },
        ]}
        min={210}
      />

      <QuickActions />

      {/* La tienda en línea se abre o se cierra desde aquí, en un clic. */}
      <Box sx={{ mb: { xs: 2, md: 3 } }}>
        <ShopSalesCard event={event} />
      </Box>

      {/* Bloqueo (utils/exportsLock): solo los KPIs de arriba. */}
      {SALES_DETAIL_ENABLED && (<>
      <Box sx={{ display: "grid", gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 2fr) minmax(0, 1fr)" }, mb: { xs: 2, md: 3 } }}>
        <Panel title="Ingresos por mes" sub="Según la fecha de cada pago" loading={income.loading}>
          <MonthlyIncomeChart data={months} totals={totals} />
        </Panel>
        <Panel title="De dónde viene el dinero" href="/reportes" loading={income.loading}>
          <SourceSplit totals={totals} />
        </Panel>
      </Box>

      <Box sx={{ display: "grid", gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(3, minmax(0, 1fr))" } }}>
        <Panel title="Invitaciones" sub={`${invited} enviadas`} href="/tickets/invitaciones" loading={invitesQ.isLoading}>
          <MeterList rows={inviteRows} empty="Todavía no hay invitaciones." />
        </Panel>
        <Panel title="Solicitudes por estado" sub={`${income.applications.total} en total, con artistas invitados`} href="/solicitudes" loading={income.loading}>
          <MeterList rows={applicationRows} empty="Todavía no hay solicitudes." />
        </Panel>
        <Panel title="Registros por enlace" sub={`${linkUses} de ${linkSeats} cupos usados`} href="/tickets/invitaciones" loading={linksQ.isLoading}>
          <MeterList rows={linkRows} empty="Todavía no hay enlaces." />
        </Panel>
      </Box>
      </>)}
    </Box>
  );
}
