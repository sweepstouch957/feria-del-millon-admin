"use client";

import { useDeferredValue, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCustomers, type CustomerDoc } from "@services/orders.service";

/** Minúsculas, sin tildes ni espacios de más: "José" encuentra "jose". */
const norm = (s?: string | null) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const digits = (s?: string | null) => String(s ?? "").replace(/\D/g, "");

/**
 * Compradores que ya compraron (uno por correo). Se baja la lista una vez y se
 * filtra en el navegador: cada tecla responde al instante, sin ir al servidor.
 * ponytail: lista completa en memoria; buscar en el backend si pasa de ~20 mil.
 */
export function useCustomerSearch(text: string) {
  const { data: all = [], isLoading } = useQuery({
    queryKey: ["caja", "customers"],
    queryFn: listCustomers,
    staleTime: 5 * 60_000,
  });

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

  return { results, isLoading, total: all.length };
}
