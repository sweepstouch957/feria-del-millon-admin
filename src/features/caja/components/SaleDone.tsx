"use client";

import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { CheckCircle2 } from "lucide-react";
import { FDM } from "@/app/theme";
import { formatCOP } from "@/utils/money";
import { artistName } from "../model/artwork";
import { METHOD_LABEL } from "../model/sale";
import type { SaleResult } from "../hooks/useCheckout";

/** Confirmación de la venta: lo que la cajera le lee al comprador. */
export function SaleDone({ result, onNext }: { result: SaleResult; onNext: () => void }) {
  const { order, artwork, values, kind, fulfillmentError } = result;
  const paidNow = kind === "layaway" ? values.abono : order.total;
  const balance = order.layaway?.balanceDue;
  const rows: [string, string][] = [
    ["Obra", [artwork.title, artistName(artwork)].filter(Boolean).join(" · ")],
    ["Comprador", `${values.buyerName} · ${values.buyerEmail}`],
    ["Método", METHOD_LABEL[values.method] ?? values.method],
    [kind === "layaway" ? "Abono" : "Cobrado", formatCOP(paidNow)],
    ["Pedido", order.id.slice(-8).toUpperCase()],
  ];

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <CheckCircle2 size={36} color={FDM.green} strokeWidth={1.5} />
        <Typography sx={{ fontSize: 22, fontWeight: 300 }}>
          {kind === "layaway" ? "Obra apartada" : "Venta registrada"}
        </Typography>
      </Box>

      {result.practice && (
        <Alert severity="warning">
          Venta de práctica: así se ve una venta registrada, pero no se cobró ni se guardó nada.
        </Alert>
      )}
      {fulfillmentError && (
        <Alert severity="error">
          El pago quedó registrado pero el inventario no se actualizó. Avisa a coordinación con el pedido{" "}
          <strong>{order.id.slice(-8).toUpperCase()}</strong> antes de vender otra copia de esta obra.
        </Alert>
      )}
      {kind === "layaway" && (
        <Alert severity="info">
          Queda un saldo de <strong>{formatCOP(balance ?? order.total - paidNow)}</strong>. Se cobra en Pedidos → Cartera.
        </Alert>
      )}
      {kind === "paid" && !fulfillmentError && !result.practice && (
        <Typography variant="body2" color="text.secondary">
          El comprador recibe el correo de confirmación y el artista ve la venta en su panel.
        </Typography>
      )}

      <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 2, rowGap: 0.75 }}>
        {rows.map(([k, v]) => (
          <Box key={k} sx={{ display: "contents" }}>
            <Typography component="dt" variant="body2" color="text.secondary">{k}</Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0, wordBreak: "break-word" }}>{v}</Typography>
          </Box>
        ))}
      </Box>

      {values.receiptUrl && (
        <Typography component="a" href={values.receiptUrl} target="_blank" rel="noreferrer" variant="body2" sx={{ color: "primary.main" }}>
          Ver comprobante adjunto
        </Typography>
      )}

      <Button autoFocus variant="contained" color="secondary" size="large" onClick={onNext} sx={{ minHeight: 52 }}>
        Nueva venta
      </Button>
    </Stack>
  );
}
