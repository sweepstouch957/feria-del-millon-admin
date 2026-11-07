import apiClient from "@/axios";

/**
 * Corrección de una venta de caja/taquilla. El método de pago (también mixto)
 * se aplica de una vez; precio y correo los aprueba administración.
 */
export type CorrectionKind = "order" | "ticket";
export type PayPart = { method: string; amount: number };

export interface SaleCorrection {
  id: string;
  kind: CorrectionKind;
  targetId: string;
  label: string;
  buyerName: string;
  before: { email: string; price: number; split?: PayPart[] };
  /** split = cambio de método (ya aplicado); email/price = a aprobación. */
  changes: { email?: string; price?: number; split?: PayPart[] };
  note: string;
  status: CorrectionStatus;
  requestedByName: string;
  saleAt?: string;
  createdAt: string;
  decidedAt?: string;
}
export type CorrectionStatus = "pending" | "approved" | "rejected" | "applied";

export const correctSale = async (body: {
  kind: CorrectionKind;
  id: string;
  /** Plata por método; suma el total de la venta. Se aplica ya. */
  split?: Record<string, number>;
  /** A aprobación. */
  email?: string;
  price?: number;
  note?: string;
}) => {
  const { data } = await apiClient.post("/order/orders/corrections", body, { withCredentials: true });
  return data as { ok: boolean; applied: boolean; pending: boolean };
};

/** Últimas 200 de ese estado (pendientes: las más viejas primero). */
export const listCorrections = async (status: CorrectionStatus = "pending") => {
  const { data } = await apiClient.get<SaleCorrection[]>("/order/orders/corrections", {
    params: { status },
    withCredentials: true,
  });
  return data;
};

export const decideCorrection = async (id: string, approve: boolean) => {
  const { data } = await apiClient.post(`/order/orders/corrections/${id}/decision`, { approve }, { withCredentials: true });
  return data as { ok: boolean; status: string };
};
