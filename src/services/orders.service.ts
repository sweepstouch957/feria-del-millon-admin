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
    address: AddressInput;
}

export interface OrderItemInput {
    artworkId: string;
    copyId?: string | null; // reservado por inventory-svc (opcional)
    artistId: string;
    qty: number;
    unitPrice: number;
    currency?: string; // default "COP" en backend
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
        installments?: { amount: number; method?: string; at?: string; note?: string; by?: string }[];
    };
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateOrderInput {
    event: string;
    items: OrderItemInput[];
    userId?: string;
    /** reservationId devuelto por inventory-svc (/inventory/holds) */
    reservationId?: string;
    /** buyer requerido por backend: name + email + address */
    buyer: BuyerInput;
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

export const markOrderPaid = async (
    orderId: string,
    payload: MarkOrderPaidInput
): Promise<{ ok: boolean; already?: boolean }> => {
    const { data } = await apiClient.post<{ ok: boolean; already?: boolean }>(
        `/order/orders/${orderId}/paid`,
        payload,
        { withCredentials: true }
    );
    return data;
};

/** POST /order/orders/:id/abono — registra un abono (pago parcial o saldo). */
export const registerAbono = async (
    orderId: string,
    payload: { amount: number; method?: PaymentMethod; note?: string; by?: string; dueDate?: string }
): Promise<{ ok: boolean; settled?: boolean; order?: OrderDoc }> => {
    const { data } = await apiClient.post<{ ok: boolean; settled?: boolean; order?: OrderDoc }>(
        `/order/orders/${orderId}/abono`,
        payload,
        { withCredentials: true }
    );
    return data;
};