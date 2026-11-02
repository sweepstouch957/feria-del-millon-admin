"use client";

import { Alert, Box } from "@mui/material";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import KpiStrip from "@/components/ui/KpiStrip";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import { useIncome } from "@features/ingresos/hooks/useIncome";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { listUsers } from "@/services/user.service";
import { formatCOP } from "@/utils/money";

const money = (n: number) => formatCOP(n, { code: true });

/** Tablero: las cifras de un vistazo. El detalle de cada una vive en Reportes. */
export default function HomeClient() {
  const { eventId, isLoading, isError, refetch } = useActiveEvent();
  if (!eventId) return <ActiveEventGate isLoading={isLoading} isError={isError} onRetry={refetch} />;
  return <Dashboard eventId={eventId} />;
}

function Dashboard({ eventId }: { eventId: string }) {
  const router = useRouter();
  const income = useIncome(eventId);
  const { data: artists } = useQuery({
    queryKey: ["dash", "users", "artists"],
    queryFn: () => listUsers({ roles: ["artista"], limit: 1 }),
    staleTime: 60_000,
  });

  return (
    <Box>
      <PageHeader
        crumb="General"
        title="Tablero"
        badge={!income.loading ? <StatusPill label="En vivo" tone="ok" dot /> : undefined}
        description="Feria activa. Toca una cifra para ver todo su detalle."
        actions={[{ label: "Ver todos los reportes", kind: "pri", href: "/reportes" }]}
      />
      {income.failed && <Alert severity="error" sx={{ mb: 2 }}>Una parte no cargó: las cifras pueden estar incompletas.</Alert>}

      <KpiStrip
        loading={income.loading}
        items={[
          { label: "Ingresos", value: money(income.total), accent: true, sub: "boletos + obras + inscripciones", onClick: () => router.push("/reportes") },
          { label: "Boletos", value: money(income.ticketsTotal), sub: `${income.tickets.length} entrada(s)`, onClick: () => router.push("/reportes?ver=boletos") },
          { label: "Obras", value: money(income.ordersTotal), sub: `${income.orders.length} venta(s)`, onClick: () => router.push("/reportes?ver=obras") },
          { label: "Inscripciones", value: money(income.appsTotal), sub: `${income.apps.length} pagada(s)`, onClick: () => router.push("/reportes?ver=inscripciones") },
          { label: "Clientes", value: income.customers.length, sub: "compraron entradas u obras", onClick: () => router.push("/reportes?ver=clientes") },
          { label: "Solicitudes", value: income.applications.total, sub: `${income.applications.accepted} aceptadas`, onClick: () => router.push("/solicitudes") },
          { label: "Artistas", value: artists?.total ?? 0, sub: "con cuenta", onClick: () => router.push("/users") },
        ]}
      />
    </Box>
  );
}
