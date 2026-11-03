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

/** Plata real: un isPaid con el cobro rechazado por la pasarela no entró. */
export const isCollected = (a: { isPaid?: boolean; paymentStatus?: string }) => !!a.isPaid && a.paymentStatus === "approved";

/**
 * Convocatorias de una feria. La de 2026 que recibió los pagos quedó enlazada a
 * un evento que ya no existe; se reconoce por llevar el mismo nombre.
 */
export function fairConvocatorias<T extends { event?: unknown; name?: string }>(all: T[], eventId: string): T[] {
  const eventOf = (c: T) => String((c.event as { _id?: string } | undefined)?._id ?? c.event ?? "");
  const names = new Set(all.filter((c) => eventOf(c) === eventId).map((c) => c.name));
  return all.filter((c) => eventOf(c) === eventId || names.has(c.name));
}

export type MonthIncome = { month: string; apps: number; orders: number; tickets: number };

/** Ingresos por mes y por fuente, sin saltarse los meses en cero. Mes en hora Colombia. */
export function monthlyIncome(rows: { at?: string; source: "apps" | "orders" | "tickets"; amount: number }[]): MonthIncome[] {
  const key = (at: string) => new Date(at).toLocaleDateString("en-CA", { timeZone: "America/Bogota" }).slice(0, 7);
  const map = new Map<string, MonthIncome>();
  for (const r of rows) {
    if (!r.at || !r.amount) continue;
    const month = key(r.at);
    const m = map.get(month) ?? { month, apps: 0, orders: 0, tickets: 0 };
    m[r.source] += r.amount;
    map.set(month, m);
  }
  const months = [...map.keys()].sort();
  if (!months.length) return [];
  const out: MonthIncome[] = [];
  let [y, mo] = months[0].split("-").map(Number);
  const last = months[months.length - 1];
  for (;;) {
    const month = `${y}-${String(mo).padStart(2, "0")}`;
    out.push(map.get(month) ?? { month, apps: 0, orders: 0, tickets: 0 });
    if (month === last) return out;
    mo += 1;
    if (mo > 12) { mo = 1; y += 1; }
  }
}

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
