// Una sola lista de personas: invitados, acompañantes, compradores e importados.
// Sin React: se prueba con people.check.ts.

export type PersonKind = "invited" | "companion" | "ticket" | "artwork" | "legacy";

export const KIND_LABEL: Record<PersonKind, string> = {
  invited: "Invitados",
  companion: "Acompañantes",
  ticket: "Compraron entrada",
  artwork: "Compraron obra",
  legacy: "Ferias pasadas",
};

type CustomerLike = {
  email?: string;
  name?: string;
  phone?: string | null;
  document?: string | null;
  address?: { line1?: string; city?: string } | null;
  ordersCount?: number;
  totalSpent?: number;
  meta?: { legacy?: { purchases?: number; spent?: number; cityName?: string } };
};
type TicketPersonLike = {
  email: string;
  name?: string;
  phone?: string;
  document?: string;
  addressLine?: string;
  cityName?: string;
  source?: string;
  kind: "invited" | "companion" | "ticket";
  confirmed?: boolean;
};

export type Person = {
  email: string;
  name: string;
  phone: string;
  document: string;
  address: string;
  city: string;
  kinds: PersonKind[];
  /** "Viene de Itaú", "Acompañante de Ana"… */
  detail: string;
  confirmed: boolean | null;
  orders: number;
  spent: number;
  pastPurchases: number;
  pastSpent: number;
};

/** Une por correo. Los datos de esta plataforma mandan; lo importado solo llena lo que falte. */
export function mergePeople(
  customers: CustomerLike[],
  ticketPeople: TicketPersonLike[],
  cityName: (id: string) => string | undefined = () => undefined,
): Person[] {
  const map = new Map<string, Person>();
  const get = (raw?: string) => {
    const email = String(raw ?? "").trim().toLowerCase();
    if (!email) return null;
    if (!map.has(email)) {
      map.set(email, { email, name: "", phone: "", document: "", address: "", city: "", kinds: [], detail: "", confirmed: null, orders: 0, spent: 0, pastPurchases: 0, pastSpent: 0 });
    }
    return map.get(email)!;
  };

  for (const t of ticketPeople) {
    const p = get(t.email);
    if (!p) continue;
    p.name = t.name || "";
    p.phone = t.phone || "";
    p.document = t.document || "";
    p.address = t.addressLine || "";
    p.city = t.cityName || "";
    p.kinds.push(t.kind);
    p.detail = t.source || "";
    p.confirmed = t.kind === "ticket" ? null : !!t.confirmed;
  }
  for (const c of customers) {
    const p = get(c.email);
    if (!p) continue;
    p.name ||= c.name || "";
    p.phone ||= c.phone || "";
    p.document ||= c.document || "";
    p.address ||= c.address?.line1 || "";
    p.city ||= (c.address?.city && cityName(String(c.address.city))) || c.meta?.legacy?.cityName || "";
    p.orders = c.ordersCount || 0;
    p.spent = c.totalSpent || 0;
    p.pastPurchases = c.meta?.legacy?.purchases || 0;
    p.pastSpent = c.meta?.legacy?.spent || 0;
    if (p.orders > 0) p.kinds.push("artwork");
    if (p.pastPurchases > 0) p.kinds.push("legacy");
  }
  // Una persona sin ninguna relación no es comprador ni invitado.
  return [...map.values()].filter((p) => p.kinds.length).sort((a, b) => a.name.localeCompare(b.name, "es"));
}
