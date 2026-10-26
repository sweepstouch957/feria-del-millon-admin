import { z } from "zod";
import type { BoxOfficeSaleInput } from "@services/ticket.service";

export type SellType = BoxOfficeSaleInput["type"];
export type BoxOfficeMethod = BoxOfficeSaleInput["method"];

type TypeSpec = {
  key: SellType;
  price?: number;
  pickDay?: boolean;
  quantities?: number[];
  packPrices?: Record<number, number>;
  maxQty?: number;
};

// Espejo de TICKET_TYPES (tickets-svc/utils/pricing.js). El backend es quien cobra.
export const TICKET_TYPES: TypeSpec[] = [
  { key: "general", pickDay: true },
  { key: "allpass", price: 80000 },
  { key: "2x1", pickDay: true },
  { key: "estudiante", price: 0, pickDay: true, maxQty: 1 },
  // Empresas: un día, paquetes; 20% de descuento desde 50.
  { key: "empresa", price: 55000, pickDay: true, quantities: [20, 50, 100], packPrices: { 20: 55000, 50: 44000, 100: 44000 } },
];

export const specOf = (t: SellType) => TICKET_TYPES.find((s) => s.key === t)!;

export const BOX_OFFICE_METHODS: { value: BoxOfficeMethod; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "card_offline", label: "Datáfono" },
  { value: "transfer", label: "Transferencia" },
];

export const boxOfficeSchema = z
  .object({
    type: z.enum(["general", "allpass", "2x1", "estudiante", "empresa"]),
    date: z.string(),
    quantity: z.number({ error: "Cantidad" }).int().min(1, "Mínimo 1").max(100),
    method: z.enum(["cash", "card_offline", "transfer"]),
    name: z.string().trim().min(3, "Escribe el nombre completo"),
    email: z.string().trim().email("Correo no válido"),
    phone: z.string().trim(),
    company: z.string().trim(),
    nit: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    if (specOf(v.type).pickDay && !v.date) ctx.addIssue({ code: "custom", path: ["date"], message: "Elige el día" });
  });

export type BoxOfficeValues = z.infer<typeof boxOfficeSchema>;

export const BOX_OFFICE_DEFAULTS: BoxOfficeValues = {
  type: "general",
  date: "",
  quantity: 1,
  method: "cash",
  name: "",
  email: "",
  phone: "",
  company: "",
  nit: "",
};

/** Precio unitario de referencia (el cobro real lo calcula tickets-svc). */
export function unitPrice(v: Pick<BoxOfficeValues, "type" | "quantity" | "date">, dayPrice?: number) {
  const spec = specOf(v.type);
  return spec.packPrices?.[v.quantity] ?? spec.price ?? dayPrice ?? 0;
}
