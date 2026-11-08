"use client";

import * as React from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from "@mui/material";
import { toast } from "sonner";
import type { OrderDoc } from "@services/orders.service";
import { formatCOP } from "@/utils/money";
import { formatDate } from "@/utils/date";
import type { PillTone } from "@/components/ui/StatusPill";

const money = (n?: number) => formatCOP(n, { code: true });
export const STATUS: Record<OrderDoc["status"], { label: string; tone: PillTone }> = {
  created: { label: "Creado", tone: "mid" },
  payment_processing: { label: "Procesando pago", tone: "mid" },
  partial: { label: "Abono / fiado", tone: "warn" },
  paid: { label: "Pagado", tone: "ok" },
  failed: { label: "Fallido", tone: "bad" },
  canceled: { label: "Cancelado", tone: "mid" },
  refunded: { label: "Reembolsado", tone: "mid" },
};
const DELIVERY: Record<string, string> = { pending: "Por entregar", delivered: "Entregada", returned: "Devuelta" };

function Row({ k, v }: { k: string; v?: React.ReactNode }) {
  if (v === undefined || v === null || v === "") return null;
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 130, textTransform: "uppercase", letterSpacing: 1 }}>{k}</Typography>
      <Typography fontSize={14} sx={{ wordBreak: "break-word" }}>{v}</Typography>
    </Stack>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="overline" color="primary">{title}</Typography>
      <Divider sx={{ mb: 1 }} />
      {children}
    </Box>
  );
}

/** Toda la información de un pedido y su comprador. `all` = las órdenes cargadas, para el historial. */
export function OrderDetailDialog({ order, all, onClose }: { order: OrderDoc | null; all: OrderDoc[]; onClose: () => void }) {
  if (!order) return null;
  const b = order.buyer;
  const a = b?.address;
  const address = [a?.line1, a?.line2, order.cityName, a?.state, a?.zip, a?.country].filter(Boolean).join(", ");
  const phoneDigits = (b?.phone || "").replace(/\D/g, "");
  const email = (b?.email || "").toLowerCase();
  // ponytail: historial sobre las órdenes ya cargadas (respeta el filtro de estado).
  const history = email ? all.filter((o) => (o.buyer?.email || "").toLowerCase() === email) : [order];
  const spent = history.filter((o) => o.status === "paid").reduce((s, o) => s + Number(o.total || 0), 0);
  const p = order.payment;
  const d = p?.details || {};
  const receipt = d.receiptUrl as string | undefined;

  const copy = () => {
    const text = [b?.name, b?.document && `Doc: ${b.document}`, b?.phone, b?.email, address].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text).then(() => toast.success("Datos copiados"), () => toast.error("No se pudo copiar"));
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle>
        {b?.name || "Comprador"}
        <Typography variant="caption" color="text.secondary" display="block">
          Pedido #{String(order.id).slice(-8).toUpperCase()} · {formatDate(order.createdAt)}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Section title="Comprador">
          <Row k="Nombre" v={b?.name} />
          <Row k="Documento" v={b?.document} />
          <Row k="Correo" v={b?.email && <a href={`mailto:${b.email}`}>{b.email}</a>} />
          <Row
            k="Teléfono"
            v={b?.phone && (
              <>
                <a href={`tel:${b.phone}`}>{b.phone}</a>
                {phoneDigits.length >= 10 && (
                  <> · <a href={`https://wa.me/${phoneDigits.length === 10 ? `57${phoneDigits}` : phoneDigits}`} target="_blank" rel="noreferrer">WhatsApp</a></>
                )}
              </>
            )}
          />
          <Row k="Dirección" v={address} />
          <Row k="Cuenta en la web" v={order.account ? [order.account.name, order.account.email, order.account.phone].filter(Boolean).join(" · ") : "Compró sin cuenta"} />
          <Row k="Pedidos" v={`${history.length} (${history.filter((o) => o.status === "paid").length} pagados) · ${money(spent)} pagado`} />
        </Section>

        <Section title={`Obras (${order.items?.length || 0})`}>
          {(order.items || []).map((it, i) => (
            <Stack key={i} direction="row" spacing={2} sx={{ py: 1 }} alignItems="center">
              {it.image && <Box component="img" src={it.image} alt={it.title} sx={{ width: 64, height: 64, objectFit: "cover", flexShrink: 0 }} />}
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={500} fontSize={14}>{it.title || it.artworkId}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {[it.artistName, it.qty > 1 && `x${it.qty}`, it.deliveryStatus && DELIVERY[it.deliveryStatus]].filter(Boolean).join(" · ")}
                </Typography>
              </Box>
              <Box textAlign="right">
                <Typography fontSize={14}>{money(it.unitPrice)}</Typography>
                {it.listPrice != null && it.listPrice > it.unitPrice && (
                  <Typography variant="caption" color="text.secondary" sx={{ textDecoration: "line-through" }}>{money(it.listPrice)}</Typography>
                )}
              </Box>
            </Stack>
          ))}
          {!!order.discount?.amount && <Row k="Descuento" v={`${money(order.discount.amount)}${order.discount.note ? ` — ${order.discount.note}` : ""}`} />}
          <Row k="Total" v={<b>{money(order.total)}</b>} />
        </Section>

        <Section title="Pago">
          <Row k="Estado" v={STATUS[order.status]?.label || order.status} />
          <Row k="Método" v={p?.method} />
          <Row k="Estado pasarela" v={p?.state} />
          <Row k="Transacción" v={p?.gateway?.transactionId} />
          <Row k="Referencia" v={p?.reference} />
          <Row k="Tarjeta" v={d.cardLast4 && `•••• ${d.cardLast4}${d.cardHolder ? ` · ${d.cardHolder}` : ""}`} />
          <Row k="Autorización" v={d.authCode} />
          <Row k="Cobró" v={order.cashierName} />
          <Row k="Notas" v={d.notes} />
          <Row k="Comprobante" v={receipt && <a href={receipt} target="_blank" rel="noreferrer">Ver foto</a>} />
          <Row k="Factura" v={order.invoice?.number} />
          <Row k="Pagado el" v={order.paidAt && formatDate(order.paidAt)} />
          <Row k="Reembolsado el" v={order.refundedAt && formatDate(order.refundedAt)} />
          {order.fulfillmentError && <Row k="Stock" v={<Typography color="error" fontSize={14}>Pagada sin descontar stock: {order.fulfillmentError}</Typography>} />}
        </Section>

        {order.layaway?.enabled && (
          <Section title="Abonos">
            <Row k="Pagado" v={money(order.layaway.amountPaid)} />
            <Row k="Saldo" v={money(order.layaway.balanceDue)} />
            <Row k="Vence" v={order.layaway.dueDate && formatDate(order.layaway.dueDate)} />
            {(order.layaway.installments || []).map((ins, i) => (
              <Row
                key={i}
                k={ins.at ? formatDate(ins.at) : `Abono ${i + 1}`}
                v={<>
                  {[money(ins.amount), ins.method, ins.byName, ins.note].filter(Boolean).join(" · ")}
                  {ins.receiptUrl && <> · <a href={ins.receiptUrl} target="_blank" rel="noreferrer">comprobante</a></>}
                </>}
              />
            ))}
          </Section>
        )}

        <Typography variant="caption" color="text.secondary">ID {order.id}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={copy}>Copiar datos de envío</Button>
        <Button variant="contained" onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
