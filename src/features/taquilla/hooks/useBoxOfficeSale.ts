"use client";

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sellAtBoxOffice } from "@services/ticket.service";
import { specOf, type BoxOfficeValues } from "../model/boxOffice";

const ERRORS: Record<string, string> = {
  capacity_reached: "No hay cupo disponible ese día.",
  student_ticket_already_issued: "Este correo ya tiene entrada de estudiante.",
  invalid_quantity: "Cantidad no válida para este tipo.",
};

export const boxOfficeError = (e: any) => ERRORS[e?.response?.data?.error] ?? "No se pudo registrar la venta.";

/**
 * Venta en taquilla. La llave de idempotencia vive mientras la venta no se
 * complete: si la red falla y la cajera reintenta, no se emiten boletas dobles.
 */
export function useBoxOfficeSale(eventId: string) {
  const qc = useQueryClient();
  const idem = useRef(crypto.randomUUID());

  const mutation = useMutation({
    mutationFn: (v: BoxOfficeValues) => {
      const empresa = v.type === "empresa";
      return sellAtBoxOffice({
        eventId,
        type: v.type,
        date: specOf(v.type).pickDay ? v.date : undefined,
        quantity: v.quantity,
        method: v.method,
        idempotencyKey: idem.current,
        buyer: {
          name: v.name,
          email: v.email,
          phone: v.phone || undefined,
          company: empresa ? v.company || undefined : undefined,
          nit: empresa ? v.nit || undefined : undefined,
        },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ticketDays", eventId] }),
  });

  const next = () => {
    idem.current = crypto.randomUUID();
    mutation.reset();
  };

  return { ...mutation, next };
}
