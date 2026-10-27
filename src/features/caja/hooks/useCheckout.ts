"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/provider/authProvider";
import {
  claimOrderStock,
  createOrder,
  markOrderPaid,
  registerAbono,
  type BuyerInput,
  type OrderDoc,
} from "@services/orders.service";
import type { CityDoc } from "@services/city.service";
import { artistName, artworkId, type CajaArtwork } from "../model/artwork";
import type { SaleValues } from "../model/sale";
import { addPracticeSale, practiceId, wait } from "../model/practice";
import { todayBogota } from "./useMySales";

export type SaleResult = {
  order: OrderDoc;
  artwork: CajaArtwork;
  values: SaleValues;
  /** paid = cobrada completa; layaway = apartada con saldo pendiente. */
  kind: "paid" | "layaway";
  /** Cobrada pero el stock no bajó: avisar a coordinación. */
  fulfillmentError?: string;
  /** Venta de capacitación: no se guardó nada. */
  practice?: boolean;
};

/** Misma respuesta que una venta real, sin tocar el servidor. */
async function simulateSale(artwork: CajaArtwork, values: SaleValues, cashier: string): Promise<SaleResult> {
  await wait(500);
  // Mismo error que daría el servidor: así se practica también la obra agotada.
  if (Number(artwork.stock ?? 0) < values.qty) throw { response: { data: { error: "sin_stock" } } };
  const total = values.price * values.qty;
  const order = {
    id: practiceId(),
    status: values.apartar ? "partial" : "paid",
    event: "",
    items: [],
    subtotal: total,
    total,
    currency: artwork.currency ?? "COP",
    layaway: values.apartar ? { balanceDue: Math.max(0, total - values.abono) } : undefined,
  } as OrderDoc;
  addPracticeSale({
    day: todayBogota(), orderId: order.id, artwork: artwork.title || "Obra", artist: artistName(artwork),
    technique: artwork.techniqueInfo?.name || "", pavilion: artwork.pavilionInfo?.name || "",
    qty: values.qty, amount: values.apartar ? values.abono : total, channel: "Caja", method: values.method,
    buyer: values.buyerName, buyerEmail: values.buyerEmail, buyerPhone: values.buyerPhone, cashier,
  });
  return { order, artwork, values, kind: values.apartar ? "layaway" : "paid", practice: true };
}

const ERRORS: Record<string, string> = {
  sin_stock: "Esta obra ya se vendió. Elige otra.",
  charge_in_progress: "Esta venta ya se está registrando en otra caja.",
  sales_paused: "La venta está pausada para esta obra.",
  pavilion_not_allowed: "Esta obra es de otro pabellón. Cóbrala en la caja de ese pabellón.",
  practice_mode: "Tu cuenta está en modo práctica: pide a coordinación que la active para vender.",
};

/** Mensaje para la cajera a partir del error del backend. */
export const checkoutError = (e: any): string => {
  const code = e?.response?.data?.error;
  return ERRORS[code] ?? (typeof code === "string" ? code : "No se pudo registrar la venta. Intenta de nuevo.");
};

/**
 * Venta en caja. Orden de pasos:
 *   1. crear la orden (el precio lo pone el servidor),
 *   2. tomar el stock ANTES de dar la venta por hecha (claim-stock es atómico:
 *      si otra caja vendió la pieza un segundo antes, aquí sale `sin_stock`),
 *   3. marcar pagada.
 * Apartar usa /abono, que toma el stock en el primer abono.
 */
export function useCheckout(eventId: string | undefined, cities: CityDoc[] = []) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const cashierName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Caja";

  return useMutation({
    mutationFn: async ({ artwork, values }: { artwork: CajaArtwork; values: SaleValues }): Promise<SaleResult> => {
      if (!eventId) throw new Error("No hay feria activa");
      if (user?.practiceMode) return simulateSale(artwork, values, cashierName);
      const city = cities.find((c) => String(c._id ?? c.id) === values.cityId);

      const buyer: BuyerInput = {
        name: values.buyerName,
        email: values.buyerEmail,
        phone: values.buyerPhone,
        document: values.buyerDocument || undefined,
        // Todas las obras van a domicilio (el formulario exige dirección y ciudad).
        address: city
          ? {
              line1: values.addressLine1,
              line2: values.notes || undefined,
              city: String(city._id ?? city.id),
              country: "CO",
            }
          : undefined,
      };

      const order = await createOrder({
        event: eventId,
        items: [{
          artworkId: artworkId(artwork),
          artistId: String(artwork.artistInfo?._id ?? artwork.artist ?? ""),
          qty: values.qty,
          // Con descuento el servidor lo acepta solo si es menor al de la obra.
          unitPrice: values.price,
          currency: artwork.currency ?? "COP",
        }],
        discountNote: values.discountNote || undefined,
        buyer,
        userId: user?.id,
      });

      if (values.apartar) {
        const r = await registerAbono(order.id, {
          amount: values.abono,
          method: values.method,
          note: values.notes,
          by: user?.id,
          dueDate: values.dueDate || undefined,
          receiptUrl: values.receiptUrl || undefined,
        });
        return { order: r.order ?? order, artwork, values, kind: r.settled ? "paid" : "layaway" };
      }

      await claimOrderStock(order.id);
      const paid = await markOrderPaid(order.id, {
        method: values.method,
        amount: order.total,
        details: {
          cashierId: user?.id,
          authCode: values.authCode || undefined,
          receiptUrl: values.receiptUrl || undefined,
          notes: values.notes || undefined,
          deliveryAddress: buyer.address,
        },
        invoice: { channel: "event_pos", issuedBy: cashierName },
      });
      return { order, artwork, values, kind: "paid", fulfillmentError: paid.fulfillmentError };
    },
    onSettled: () => {
      // Stock y cierre del día cambian con cada venta.
      qc.invalidateQueries({ queryKey: ["artworks"] });
      qc.invalidateQueries({ queryKey: ["caja", "my-sales"] });
      qc.invalidateQueries({ queryKey: ["caja", "customers"] }); // el comprador nuevo ya sale en el buscador
    },
  });
}
