"use client";

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { sellAtBoxOffice, type Ticket } from "@services/ticket.service";
import { useCajaAccess } from "@features/caja/hooks/useCajaAccess";
import { wait } from "@features/caja/model/practice";
import { specOf, type BoxOfficeValues } from "../model/boxOffice";

const ERRORS: Record<string, string> = {
  capacity_reached: "No hay cupo disponible ese día.",
  student_ticket_already_issued: "Este correo ya tiene entrada de estudiante.",
  invalid_quantity: "Cantidad no válida para este tipo.",
  practice_mode: "Tu cuenta está en modo práctica: pide a coordinación que la active para vender.",
};

export const boxOfficeError = (e: any) => ERRORS[e?.response?.data?.error] ?? "No se pudo registrar la venta.";

/** Prefijo de los QR de práctica: el validador los reconoce sin ir al servidor. */
export const PRACTICE_QR_PREFIX = "FDM-PRACTICA:";

/** Boletas de práctica: QR de verdad (se pueden escanear en el validador), sin guardar nada. */
async function simulateBoxOffice(v: BoxOfficeValues) {
  await wait(500);
  const n = v.type === "2x1" ? v.quantity * 2 : v.quantity;
  const tickets = await Promise.all(
    Array.from({ length: Math.min(n, 20) }, async (_, i) => {
      const shortCode = `P${Date.now().toString(36).slice(-5).toUpperCase()}${i}`;
      return {
        id: shortCode,
        shortCode,
        eventDay: v.date || "",
        qrDataUrl: await QRCode.toDataURL(`${PRACTICE_QR_PREFIX}${shortCode}|${v.name}|${v.type}`, { width: 320, margin: 1 }),
      } as unknown as Ticket;
    }),
  );
  return { ok: true, tickets, payment: { amount: 0 } };
}

/**
 * Venta en taquilla. La llave de idempotencia vive mientras la venta no se
 * complete: si la red falla y la cajera reintenta, no se emiten boletas dobles.
 */
export function useBoxOfficeSale(eventId: string) {
  const qc = useQueryClient();
  const idem = useRef(crypto.randomUUID());

  const { practice } = useCajaAccess();

  const mutation = useMutation({
    mutationFn: (v: BoxOfficeValues) => {
      if (practice) return simulateBoxOffice(v);
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
