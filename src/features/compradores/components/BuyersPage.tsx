"use client";

import { useMemo, useState } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import KpiStrip from "@/components/ui/KpiStrip";
import PageHeader from "@/components/ui/PageHeader";
import { Rows } from "@features/ingresos/components/IncomePage";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { useCities } from "@hooks/useCities";
import { listCustomers } from "@services/orders.service";
import { getTicketPeople } from "@services/ticket.service";
import type { CsvCol } from "@/utils/csv";
import { KIND_LABEL, mergePeople, type Person, type PersonKind } from "../model/people";

const COLS: CsvCol<Person>[] = [
  { header: "Nombre", value: (p) => p.name },
  { header: "Grupo", value: (p) => p.kinds.map((k) => KIND_LABEL[k]).join(", ") },
  { header: "Detalle", value: (p) => p.detail },
  { header: "Correo", value: (p) => p.email },
  { header: "Teléfono", value: (p) => p.phone, text: true },
  { header: "Documento", value: (p) => p.document, text: true },
  { header: "Ciudad", value: (p) => p.city },
  { header: "Dirección", value: (p) => p.address },
  { header: "Invitación", value: (p) => (p.confirmed === null ? "" : p.confirmed ? "Confirmó" : "Sin confirmar") },
  { header: "Obras compradas", value: (p) => p.orders },
  { header: "Recibido", value: (p) => p.spent },
  { header: "Compras en ferias pasadas", value: (p) => p.pastPurchases },
  { header: "Valor", value: (p) => p.pastSpent },
];

const KINDS = Object.keys(KIND_LABEL) as PersonKind[];

export function BuyersPage() {
  const { eventId, isLoading, isError, refetch } = useActiveEvent();
  if (!eventId) return <ActiveEventGate isLoading={isLoading} isError={isError} onRetry={refetch} />;
  return <Buyers eventId={eventId} />;
}

/** Todas las personas que tienen relación con la feria, sin cuenta ni login. */
function Buyers({ eventId }: { eventId: string }) {
  const [kind, setKind] = useState<PersonKind | "">("");
  const customersQ = useQuery({ queryKey: ["caja", "customers"], queryFn: listCustomers, staleTime: 60_000 });
  const peopleQ = useQuery({ queryKey: ["caja", "ticketPeople", eventId], queryFn: () => getTicketPeople(eventId), staleTime: 60_000 });
  const { data: cities = [] } = useCities();

  const people = useMemo(() => {
    const names = new Map(cities.map((c) => [String(c._id ?? c.id), c.name]));
    return mergePeople(customersQ.data ?? [], peopleQ.data ?? [], (id) => names.get(id));
  }, [customersQ.data, peopleQ.data, cities]);
  const shown = useMemo(() => (kind ? people.filter((p) => p.kinds.includes(kind)) : people), [people, kind]);
  const loading = customersQ.isLoading || peopleQ.isLoading;

  return (
    <Box>
      <PageHeader
        crumb="Comunidad"
        title="Compradores"
        description="Invitados, acompañantes, quienes compraron entradas u obras y compradores de ferias pasadas. No necesitan cuenta para aparecer aquí."
      />
      {(customersQ.isError || peopleQ.isError) && (
        <Alert severity="error" sx={{ mb: 2 }}>Una parte no cargó: la lista puede estar incompleta.</Alert>
      )}
      <KpiStrip
        loading={loading}
        min={150}
        items={[
          { label: "Todos", value: people.length, onClick: () => setKind(""), selected: !kind },
          ...KINDS.map((k) => ({
            label: KIND_LABEL[k],
            value: people.filter((p) => p.kinds.includes(k)).length,
            onClick: () => setKind(k),
            selected: kind === k,
          })),
        ]}
      />
      {loading ? (
        <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Box>
      ) : (
        <Rows key={kind} rows={shown} cols={COLS} name={kind ? `compradores_${kind}` : "compradores"} />
      )}
    </Box>
  );
}
