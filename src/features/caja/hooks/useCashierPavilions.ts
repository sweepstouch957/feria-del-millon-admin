"use client";

import { useMemo } from "react";
import { useAuth } from "@/provider/authProvider";
import { usePavilions } from "@hooks/usePavilions";
import type { PavilionDoc } from "@services/pavilions.service";

export const pavilionId = (p: PavilionDoc) => String(p._id ?? p.id);

/**
 * Pabellones que puede cobrar quien está en caja. Una cajera asignada a uno o
 * más pabellones (Ferias → pabellón → cajeros) queda fija en esos; el staff y
 * la cajera sin asignar ven todos. orders-svc exige lo mismo (pavilion_not_allowed).
 */
export function useCashierPavilions(eventId?: string) {
  const { user } = useAuth();
  const { data: all = [], isLoading } = usePavilions(eventId);

  return useMemo(() => {
    const r = user?.roles ?? {};
    const isCashierOnly = !!r.cajero && !r.superuser && !r.staff;
    const mine = all.filter((p) => (p.cashiers ?? []).map(String).includes(String(user?.id)));
    const locked = isCashierOnly && mine.length > 0;
    return { options: locked ? mine : all, locked, isLoading };
  }, [all, user, isLoading]);
}
