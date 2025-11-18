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

/** Payloads específicos de cada método de pago (payments-svc) */

export interface CashPaymentConfirmInput {
    orderId: string;
    cashierId: string;
    amount: number;
    cashDrawerId?: string;
}

export interface CardOfflineConfirmInput {
    orderId: string;
    cashierId: string;
    amount: number;
    cardLast4?: string;
    cardHolder?: string;
    posTerminalId?: string;
}

export interface CreditCardConfirmInput {
    orderId: string;
    cashierId?: string;
    amount: number;
    authCode?: string;
    cardLast4?: string;
    cardHolder?: string;
}

export interface WhatsappInitiateInput {
    orderId: string;
    phone: string;
    messageId?: string;
    notes?: string;
}

export interface WhatsappConfirmInput {
    orderId: string;
    amount: number;
    confirmedBy?: string;
    reference?: string;
}

export interface ItauMockCheckoutInput {
    orderId: string;
    buyer?: {
        email?: string;
        firstName?: string;
        lastName?: string;
    };
}

export interface ItauMockCheckoutResponse {
    ok: boolean;
    reference: string;
    redirectUrl: string;
}


export interface MercadoPagoCheckoutInput {
    orderId: string;
    /** Opcionales: override de back_urls si quieres por orden */
    successUrl?: string;
    failureUrl?: string;
    pendingUrl?: string;
}

export interface MercadoPagoCheckoutResponse {
    ok: boolean;
    preferenceId: string;
    initPoint: string;
    sandboxInitPoint?: string;
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

/** GET /order/orders/:id */
export const getOrder = async (orderId: string): Promise<OrderDoc> => {
    const { data } = await apiClient.get<OrderDoc>(`/order/orders/${orderId}`, {
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

/** PATCH /order/orders/:id (ajustes puntuales de la orden) */
export const patchOrder = async (
    orderId: string,
    patch: Partial<OrderDoc>
): Promise<OrderDoc> => {
    const { data } = await apiClient.patch<OrderDoc>(
        `/order/orders/${orderId}`,
        patch,
        {
            withCredentials: true,
        }
    );
    return normalizeId(data);
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


export const confirmCashPayment = async (
    payload: CashPaymentConfirmInput
): Promise<{ ok: boolean }> => {
    const { data } = await apiClient.post<{ ok: boolean }>(
        "/pay/payments/cash/confirm",
        payload,
        { withCredentials: true }
    );
    return data;
};

/** POST /pay/payments/card-offline/confirm */
export const confirmCardOfflinePayment = async (
    payload: CardOfflineConfirmInput
): Promise<{ ok: boolean }> => {
    const { data } = await apiClient.post<{ ok: boolean }>(
        "/pay/payments/card-offline/confirm",
        payload,
        { withCredentials: true }
    );
    return data;
};


export const confirmCreditCardPayment = async (
    payload: CreditCardConfirmInput
): Promise<{ ok: boolean }> => {
    const { data } = await apiClient.post<{ ok: boolean }>(
        "/pay/payments/credit-card/confirm",
        payload,
        { withCredentials: true }
    );
    return data;
};

export const initiateWhatsappPayment = async (
    payload: WhatsappInitiateInput
): Promise<{ ok: boolean }> => {
    const { data } = await apiClient.post<{ ok: boolean }>(
        "/pay/payments/whatsapp/initiate",
        payload,
        { withCredentials: true }
    );
    return data;
};

export const confirmWhatsappPayment = async (
    payload: WhatsappConfirmInput
): Promise<{ ok: boolean }> => {
    const { data } = await apiClient.post<{ ok: boolean }>(
        "/pay/payments/whatsapp/confirm",
        payload,
        { withCredentials: true }
    );
    return data;
};
export const startItauMockCheckout = async (
    payload: ItauMockCheckoutInput
): Promise<ItauMockCheckoutResponse> => {
    const { data } = await apiClient.post<ItauMockCheckoutResponse>(
        "/pay/payments/itau/mock/checkout",
        payload,
        { withCredentials: true }
    );
    return data;
};

export const sendItauMockWebhook = async (payload: {
    orderId: string;
    reference?: string;
    state: "approved" | "declined" | "expired" | "pending";
}): Promise<{ ok: boolean }> => {
    const { data } = await apiClient.post<{ ok: boolean }>(
        "/pay/payments/itau/mock/webhook",
        payload,
        { withCredentials: true }
    );
    return data;
};

export const sendMockPaidWebhook = async (payload: {
    orderId: string;
}): Promise<{ ok: boolean }> => {
    const { data } = await apiClient.post<{ ok: boolean }>(
        "/pay/payments/mock-webhook-paid",
        payload,
        { withCredentials: true }
    );
    return data;
};

export const startMercadoPagoCheckout = async (
    payload: MercadoPagoCheckoutInput
): Promise<MercadoPagoCheckoutResponse> => {
    const { data } = await apiClient.post<MercadoPagoCheckoutResponse>(
        "/pay/payments/mercadopago/checkout",
        payload,
        { withCredentials: true }
    );
    return data;
};

export const sendMercadoPagoWebhookManual = async (payload: {
    orderId: string;
    status: "approved" | "pending" | "rejected";
    mpPaymentId?: string;
    raw?: any;
}): Promise<{ ok: boolean }> => {
    const { data } = await apiClient.post<{ ok: boolean }>(
        "/pay/payments/mercadopago/webhook",
        payload,
        { withCredentials: true }
    );
    return data;
    
};

export const chargeMercadoPagoCard = async (payload: {
    orderId: string;
    token: string;
    installments?: number;
    paymentMethodId?: string;
    issuerId?: string;
    email: string;
}) => {
    const { data } = await apiClient.post<{
        ok: boolean;
        status: string;
        payment: any;
    }>("/pay/payments/mercadopago/card-charge", payload, {
        withCredentials: true,
    });
    return data;
};