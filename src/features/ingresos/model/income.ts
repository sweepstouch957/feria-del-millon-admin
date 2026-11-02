// Cuánta plata entró y de quién. Sin React: se prueba con income.check.ts.

export const methodLabel = (m?: string) => {
  if (m === "cash") return "Efectivo";
  if (m === "card_offline") return "Datáfono";
  if (m === "transfer" || m === "whatsapp") return "Transferencia";
  if (m === "mercadopago" || m === "credit_card" || m === "pse") return "En línea";
  if (m === "free") return "Sin costo";
  return m || "Sin método";
};

export type MethodTotal = { label: string; count: number; amount: number };

/** Suma por grupo, de mayor a menor. */
export function groupTotals<T>(rows: T[], group: (r: T) => string, amount: (r: T) => number): MethodTotal[] {
  const map = new Map<string, MethodTotal>();
  for (const r of rows) {
    const label = group(r);
    const m = map.get(label) ?? { label, count: 0, amount: 0 };
    m.count += 1;
    m.amount += amount(r);
    map.set(label, m);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export const byMethod = <T,>(rows: T[], method: (r: T) => string | undefined, amount: (r: T) => number) =>
  groupTotals(rows, (r) => methodLabel(method(r)), amount);

/** Lo cobrado por una inscripción; si no quedó guardado, el valor de su convocatoria. */
export const appAmount = (a: { paymentDetails?: { transaction_amount?: number }; convocatoria?: unknown }) =>
  Number(a.paymentDetails?.transaction_amount ?? (a.convocatoria as { fee?: number } | undefined)?.fee ?? 0);

type OrderLike = {
  status: string;
  total?: number;
  layaway?: { amountPaid?: number };
  buyer?: { name?: string; email?: string; phone?: string; document?: string; address?: { line1?: string } };
  cityName?: string;
};
type TicketLike = {
  price?: number;
  buyer?: { name?: string; email?: string; phone?: string; documentNumber?: string; address?: string; city?: string; company?: string };
};

/** Lo que de verdad entró por una orden: completa si está pagada, los abonos si está apartada. */
export const orderIncome = (o: OrderLike) =>
  o.status === "paid" ? Number(o.total || 0) : o.status === "partial" ? Number(o.layaway?.amountPaid || 0) : 0;

export type Customer = {
  email: string;
  name: string;
  phone: string;
  document: string;
  address: string;
  city: string;
  company: string;
  tickets: number;
  ticketsAmount: number;
  orders: number;
  ordersAmount: number;
};

/** Clientes = quienes compraron entradas u obras, uno por correo. Un invitado no cuenta. */
export function buildCustomers(tickets: TicketLike[], orders: OrderLike[]): Customer[] {
  const map = new Map<string, Customer>();
  const get = (raw?: string) => {
    const email = String(raw || "").trim().toLowerCase();
    if (!email) return null;
    if (!map.has(email)) {
      map.set(email, { email, name: "", phone: "", document: "", address: "", city: "", company: "", tickets: 0, ticketsAmount: 0, orders: 0, ordersAmount: 0 });
    }
    return map.get(email)!;
  };
  for (const t of tickets) {
    const c = get(t.buyer?.email);
    if (!c) continue;
    c.tickets += 1;
    c.ticketsAmount += Number(t.price || 0);
    c.name ||= t.buyer?.name || "";
    c.phone ||= t.buyer?.phone || "";
    c.document ||= t.buyer?.documentNumber || "";
    c.address ||= t.buyer?.address || "";
    c.city ||= t.buyer?.city || "";
    c.company ||= t.buyer?.company || "";
  }
  for (const o of orders) {
    const paid = orderIncome(o);
    if (!paid) continue;
    const c = get(o.buyer?.email);
    if (!c) continue;
    c.orders += 1;
    c.ordersAmount += paid;
    c.name ||= o.buyer?.name || "";
    c.phone ||= o.buyer?.phone || "";
    c.document ||= o.buyer?.document || "";
    c.address ||= o.buyer?.address?.line1 || "";
    c.city ||= o.cityName || "";
  }
  return [...map.values()].sort((a, b) => b.ticketsAmount + b.ordersAmount - (a.ticketsAmount + a.ordersAmount));
}
