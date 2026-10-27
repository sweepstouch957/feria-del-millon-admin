import { z } from "zod";

/* Venta en caja: los mismos datos que pide la tienda en línea. Todas las
   obras se entregan a domicilio, así que la dirección siempre es obligatoria.
   El artista ve estos datos en su panel: no hay "venta anónima". */

export const CAJA_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "card_offline", label: "Datáfono" },
  { value: "whatsapp", label: "Transferencia" },
] as const;

export type CajaMethod = (typeof CAJA_METHODS)[number]["value"];

export const METHOD_LABEL: Record<string, string> = Object.fromEntries(
  CAJA_METHODS.map((m) => [m.value, m.label]),
);

const baseSchema = z.object({
  qty: z.number({ error: "Cantidad" }).int().min(1, "Mínimo 1"),
  /** Precio por unidad que se cobra. Igual al de la obra, o menor si el artista da descuento. */
  price: z.number({ error: "Escribe el precio" }),
  /** Quién autorizó el descuento (obligatorio si el precio baja). */
  discountNote: z.string().trim(),
  method: z.enum(["cash", "card_offline", "whatsapp"]),
  /** Datáfono: número de aprobación del voucher (para cuadrar caja). */
  authCode: z.string().trim(),
  buyerName: z.string().trim().min(3, "Escribe el nombre completo"),
  buyerEmail: z.string().trim().email("Correo no válido"),
  buyerPhone: z.string().trim().min(7, "Teléfono no válido"),
  buyerDocument: z.string().trim(),
  addressLine1: z.string().trim().min(5, "Dirección de entrega"),
  cityId: z.string().min(1, "Ciudad de entrega"),
  notes: z.string().trim(),
  apartar: z.boolean(),
  abono: z.number({ error: "Valor del abono" }).min(0, "No puede ser negativo"),
  dueDate: z.string(),
  /** Foto del comprobante de transferencia (Cloudinary). Opcional. */
  receiptUrl: z.string(),
});

export type SaleValues = z.infer<typeof baseSchema>;

/** Reglas que dependen de la obra: el precio nunca sube del que puso el artista. */
export const saleSchemaFor = (listPrice: number) =>
  baseSchema.superRefine((v, ctx) => {
    if (!(v.price > 0)) ctx.addIssue({ code: "custom", path: ["price"], message: "El precio debe ser mayor a 0" });
    if (v.price > listPrice) ctx.addIssue({ code: "custom", path: ["price"], message: "No puede ser mayor al precio de la obra" });
    if (v.price < listPrice && v.discountNote.length < 3) {
      ctx.addIssue({ code: "custom", path: ["discountNote"], message: "Escribe quién autorizó el descuento" });
    }
    // El servidor no aparta sin plata: el abono tiene que ser mayor a cero.
    if (v.apartar && !(v.abono > 0)) ctx.addIssue({ code: "custom", path: ["abono"], message: "Escribe cuánto abona hoy" });
  });

export const SALE_DEFAULTS: SaleValues = {
  qty: 1,
  price: 0,
  discountNote: "",
  method: "cash",
  authCode: "",
  buyerName: "",
  buyerEmail: "",
  buyerPhone: "",
  buyerDocument: "",
  addressLine1: "",
  cityId: "",
  notes: "",
  apartar: false,
  abono: 0,
  dueDate: "",
  receiptUrl: "",
};
