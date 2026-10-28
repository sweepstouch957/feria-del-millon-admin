import apiClient from "@/axios";


export type PaymentMethod =
    | "card_offline" // datáfono físico (Itaú POS)
    | "cash" // efectivo
    | "whatsapp" // transferencias coordinadas por WhatsApp
    | "itau_mock"
    | "credit_card" // tarjeta en línea o marcada manualmente
    | "pse" // pago PSE (vía webhook)
    | "mercadopago"// pago vía Mercado Pago (vía webhook);
    | "whatsapp";

export interface AddressInput {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    zip?: string;
    country?: string;
}

export interface BuyerInput {
    name: string;
    email: string;
    phone?: string;
    /** Cédula / NIT. */
    document?: string;
    address?: AddressInput;
}

export interface OrderItemInput {
    artworkId: string;
    copyId?: string | null; // reservado por inventory-svc (opcional)
    artistId: string;
    qty: number;
    unitPrice: number;
    currency?: string; // default "COP" en backend
    // Solo en lecturas (GET /orders).
    title?: string;
    image?: string;
    artistName?: string;
    listPrice?: number;
    deliveryStatus?: "pending" | "delivered" | "returned";
}

export interface PaymentDetails {
    cashierId?: string;
    cashDrawerId?: string;
    cardLast4?: string;
    cardHolder?: string;
    posTerminalId?: string;
    phone?: string;
    notes?: string;
    confirmedBy?: string;
    authCode?: string;
    [key: string]: any;
}

export interface PaymentSnapshot {
    method: PaymentMethod;
    state: "pending" | "approved" | "declined" | "expired" | "error";
    amount?: number;
    currency?: string;
    reference?: string;
    gateway?: {
        transactionId?: string;
        mock?: boolean;
        provider?: string;
        [key: string]: any;
    };
    details?: PaymentDetails;
}

export interface InvoiceSnapshot {
    number?: string;
    issuedAt?: string;
    channel?: "event_pos" | "online" | "whatsapp";
    issuedBy?: string;
    externalId?: string;
    meta?: any;
}

export interface OrderDoc {
    /** Pago capturado pero el stock no se pudo descontar (reconciliar a mano). */
    fulfillmentError?: string;
    id: string;
    _id?: string;
    status:
    | "created"
    | "payment_processing"
    | "partial"
    | "paid"
    | "failed"
    | "canceled"
    | "refunded";
    userId?: string;
    event: string;
    /** buyer guardado en la orden */
    buyer?: BuyerInput;
    items: OrderItemInput[];
    subtotal: number;
    total: number;
    /** Descuento acordado en caja (subtotal - total). */
    discount?: { amount?: number; note?: string; by?: string };
    currency: string;
    /** id de la reserva (hold) creada en inventory-svc */
    reservationId?: string | null;
    payment?: PaymentSnapshot;
    invoice?: InvoiceSnapshot;
    /** Fiado / abonos (pago diferido) */
    layaway?: {
        enabled?: boolean;
        amountPaid?: number;
        balanceDue?: number;
        dueDate?: string;
        stockClaimed?: boolean;
        installments?: { amount: number; method?: string; at?: string; note?: string; by?: string; byName?: string; receiptUrl?: string }[];
    };
    createdAt?: string;
    updatedAt?: string;
    paidAt?: string;
    refundedAt?: string;
    // Agregados por GET /orders para el panel.
    cityName?: string;
    cashierName?: string;
    account?: { name?: string; email?: string; phone?: string };
}

export interface CreateOrderInput {
    event: string;
    items: OrderItemInput[];
    userId?: string;
    /** reservationId devuelto por inventory-svc (/inventory/holds) */
    reservationId?: string;
    /** buyer requerido por backend: name + email + address */
    buyer: BuyerInput;
    /** Caja: quién autorizó el descuento (si items[].unitPrice < precio de la obra). */
    discountNote?: string;
}

/**
 * Payload para POST /orders/:id/paid (orders-svc)
 */
export interface MarkOrderPaidInput {
    method: PaymentMethod;
    amount?: number;
    transactionId?: string;
    reference?: string;
    gateway?: Record<string, any>;
    details?: PaymentDetails;
    invoice?: InvoiceSnapshot;
}



const normalizeId = <T extends { id?: string; _id?: string }>(obj: T) => ({
    ...obj,
    id: obj.id || (obj as any)._id,
});


export const createOrder = async (
    payload: CreateOrderInput
): Promise<OrderDoc> => {
    const { data } = await apiClient.post<OrderDoc>("/order/orders", payload, {
        withCredentials: true,
    });
    return normalizeId(data);
};

/** GET /order/orders (filtros por event, status, buyerEmail, buyerPhone) */
export const listOrders = async (params?: {
    event?: string;
    status?: OrderDoc["status"];
    buyerEmail?: string;
    buyerPhone?: string;
}): Promise<OrderDoc[]> => {
    const { data } = await apiClient.get<OrderDoc[]>("/order/orders", {
        params,
        withCredentials: true,
    });
    return data.map(normalizeId);
};

/**
 * POST /order/orders/:id/claim-stock — descuenta el stock ANTES de cobrar.
 * 409 `sin_stock` = la pieza ya se vendió (no cobrar).
 */
export const claimOrderStock = async (orderId: string): Promise<{ ok: boolean; already?: boolean }> => {
    const { data } = await apiClient.post(`/order/orders/${orderId}/claim-stock`, {}, { withCredentials: true });
    return data;
};

/** POST /order/orders/:id/refund — reembolso; devuelve la obra al inventario. */
export const refundOrder = async (
    orderId: string
): Promise<{ ok: boolean; already?: boolean; restoreError?: string }> => {
    const { data } = await apiClient.post(`/order/orders/${orderId}/refund`, {}, { withCredentials: true });
    return data;
};

export const markOrderPaid = async (
    orderId: string,
    payload: MarkOrderPaidInput
): Promise<{ ok: boolean; already?: boolean; fulfillmentError?: string }> => {
    const { data } = await apiClient.post<{ ok: boolean; already?: boolean; fulfillmentError?: string }>(
        `/order/orders/${orderId}/paid`,
        payload,
        { withCredentials: true }
    );
    return data;
};

/** POST /order/orders/:id/abono — registra un abono (pago parcial o saldo). */
export const registerAbono = async (
    orderId: string,
    payload: { amount: number; method?: PaymentMethod; note?: string; by?: string; dueDate?: string; receiptUrl?: string }
): Promise<{ ok: boolean; settled?: boolean; order?: OrderDoc }> => {
    const { data } = await apiClient.post<{ ok: boolean; settled?: boolean; order?: OrderDoc }>(
        `/order/orders/${orderId}/abono`,
        payload,
        { withCredentials: true }
    );
    return data;
};

export interface CustomerDoc {
    _id: string;
    email: string;
    name?: string;
    phone?: string | null;
    document?: string | null;
    address?: AddressInput | null;
    ordersCount?: number;
    totalSpent?: number;
    firstOrderAt?: string;
    lastOrderAt?: string;
}

/** GET /order/customers — compradores únicos (staff). */
export const listCustomers = async (): Promise<CustomerDoc[]> => {
    const { data } = await apiClient.get<CustomerDoc[]>("/order/customers", { withCredentials: true });
    return data;
};

export interface SalesBucket { key: string; label: string; amount: number; units: number; caja: number; online: number }
export interface SalesLine {
    day: string; orderId: string; artwork: string; artist: string; technique: string; pavilion: string;
    qty: number; amount: number; channel: string; method: string; buyer: string; buyerEmail: string; buyerPhone: string;
    cashier?: string;
}
export interface SalesReport {
    total: number; units: number; orders: number;
    byDay: SalesBucket[]; byPavilion: SalesBucket[]; byArtist: SalesBucket[]; byTechnique: SalesBucket[];
    lines: SalesLine[];
}

/** GET /order/reports/sales — ventas pagadas agregadas (staff). Fechas YYYY-MM-DD, hora Bogotá. */
export const getSalesReport = async (params: {
    event?: string; from?: string; to?: string; artist?: string; technique?: string; pavilion?: string;
    /** 1 = solo lo que cobró quien consulta (cierre de la cajera). */
    mine?: 1;
}): Promise<SalesReport> => {
    const { data } = await apiClient.get<SalesReport>("/order/reports/sales", { params, withCredentials: true });
    return data;
};
