"use client";

import { useDeferredValue, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveEvent } from "@hooks/events/useActiveEvent";
import { listCustomers, type CustomerDoc } from "@services/orders.service";
import { getTicketPeople } from "@services/ticket.service";

/** Minúsculas, sin tildes ni espacios de más: "José" encuentra "jose". */
const norm = (s?: string | null) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const digits = (s?: string | null) => String(s ?? "").replace(/\D/g, "");

/**
 * Personas que ya dejaron sus datos: compradores de obras, invitados y quienes
 * compraron entradas (uno por correo; manda quien ya compró obra, que trae la
 * dirección de entrega). Se bajan una vez y se filtran en el navegador: cada
 * tecla responde al instante.
 * ponytail: lista completa en memoria; buscar en el backend si pasa de ~20 mil.
 */
export function useCustomerSearch(text: string) {
  const { eventId } = useActiveEvent();
  const { data: buyers = [], isLoading } = useQuery({
    queryKey: ["caja", "customers"],
    queryFn: listCustomers,
    staleTime: 5 * 60_000,
  });
  const { data: people = [], isLoading: loadingPeople } = useQuery({
    queryKey: ["caja", "ticketPeople", eventId],
    queryFn: () => getTicketPeople(eventId),
    enabled: !!eventId,
    staleTime: 5 * 60_000,
  });

  const all = useMemo((): CustomerDoc[] => {
    const known = new Set(buyers.map((c) => c.email?.toLowerCase()));
    return [
      ...buyers,
      ...people
        .filter((p) => !known.has(p.email))
        .map((p) => ({
          _id: p.email,
          email: p.email,
          name: p.name,
          phone: p.phone,
          document: p.document,
          address: p.addressLine ? { line1: p.addressLine, city: "" } : null,
          cityName: p.cityName,
          source: p.source,
        })),
    ];
  }, [buyers, people]);

  const index = useMemo(
    () => all.map((c) => ({ c, words: norm([c.name, c.email].join(" ")), nums: digits([c.phone, c.document].join(" ")) })),
    [all],
  );

  const q = useDeferredValue(text);
  const results = useMemo((): CustomerDoc[] => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    const num = digits(q);
    if (!words.length) return [];
    return index
      .filter(({ words: w, nums }) => (num.length >= 4 && nums.includes(num)) || words.every((t) => w.includes(t)))
      .slice(0, 8)
      .map(({ c }) => c);
  }, [index, q]);

  return { results, isLoading: isLoading || loadingPeople, total: all.length };
}
