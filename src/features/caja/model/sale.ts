import { z } from "zod";

/* Venta en caja: los mismos datos que pide la tienda en línea (nombre,
   correo, teléfono; dirección solo si se envía). El artista ve estos datos
   en su panel, así que no hay "venta anónima". */

export const CAJA_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "card_offline", label: "Datáfono" },
  { value: "whatsapp", label: "Transferencia" },
] as const;

export type CajaMethod = (typeof CAJA_METHODS)[number]["value"];

export const METHOD_LABEL: Record<string, string> = Object.fromEntries(
  CAJA_METHODS.map((m) => [m.value, m.label]),
);

export const saleSchema = z
  .object({
    qty: z.number({ error: "Cantidad" }).int().min(1, "Mínimo 1"),
    method: z.enum(["cash", "card_offline", "whatsapp"]),
    /** Datáfono: número de aprobación del voucher (para cuadrar caja). */
    authCode: z.string().trim(),
    buyerName: z.string().trim().min(3, "Escribe el nombre completo"),
    buyerEmail: z.string().trim().email("Correo no válido"),
    buyerPhone: z.string().trim().min(7, "Teléfono no válido"),
    buyerDocument: z.string().trim(),
    delivery: z.boolean(),
    addressLine1: z.string().trim(),
    cityId: z.string(),
    notes: z.string().trim(),
    apartar: z.boolean(),
    abono: z.number({ error: "Valor del abono" }).min(0, "No puede ser negativo"),
    dueDate: z.string(),
    /** Foto del comprobante de transferencia (Cloudinary). Opcional. */
    receiptUrl: z.string(),
  })
  .superRefine((v, ctx) => {
    // El servidor no aparta sin plata: el abono tiene que ser mayor a cero.
    if (v.apartar && !(v.abono > 0)) ctx.addIssue({ code: "custom", path: ["abono"], message: "Escribe cuánto abona hoy" });
    if (v.delivery && !v.addressLine1) ctx.addIssue({ code: "custom", path: ["addressLine1"], message: "Dirección de envío" });
    if (v.delivery && !v.cityId) ctx.addIssue({ code: "custom", path: ["cityId"], message: "Ciudad de envío" });
  });

export type SaleValues = z.infer<typeof saleSchema>;

export const SALE_DEFAULTS: SaleValues = {
  qty: 1,
  method: "cash",
  authCode: "",
  buyerName: "",
  buyerEmail: "",
  buyerPhone: "",
  buyerDocument: "",
  delivery: false,
  addressLine1: "",
  cityId: "",
  notes: "",
  apartar: false,
  abono: 0,
  dueDate: "",
  receiptUrl: "",
};
