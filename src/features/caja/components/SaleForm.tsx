"use client";

import { useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Autocomplete,
  Box,
  Button,
  Collapse,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Banknote, CreditCard, Landmark } from "lucide-react";
import { eyebrow } from "@/app/theme";
import { formatCOP } from "@/utils/money";
import type { CityDoc } from "@services/city.service";
import type { CustomerDoc } from "@services/orders.service";
import { CustomerPicker } from "./CustomerPicker";
import { ReceiptInput } from "./ReceiptInput";
import { stockOf, type CajaArtwork } from "../model/artwork";
import { CAJA_METHODS, SALE_DEFAULTS, saleSchema, type SaleValues } from "../model/sale";

const METHOD_ICON = { cash: Banknote, card_offline: CreditCard, whatsapp: Landmark } as const;

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <Stack spacing={1.25}>
    <Typography sx={{ ...eyebrow, color: "text.secondary" }}>{title}</Typography>
    {children}
  </Stack>
);

/** Formulario de cobro. Se monta de nuevo en cada venta, así arranca limpio. */
export function SaleForm({
  artwork,
  cities,
  disabled,
  isPending,
  onSubmit,
}: {
  artwork: CajaArtwork;
  cities: CityDoc[];
  disabled?: boolean;
  isPending: boolean;
  onSubmit: (values: SaleValues) => void;
}) {
  const { control, register, handleSubmit, setValue, formState: { errors } } = useForm<SaleValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: SALE_DEFAULTS,
    mode: "onTouched",
  });
  const [method, delivery, apartar, qty, abono] = useWatch({
    control,
    name: ["method", "delivery", "apartar", "qty", "abono"],
  });

  const [uploading, setUploading] = useState(false);
  const stock = stockOf(artwork);
  const total = Number(artwork.price ?? 0) * (Number(qty) || 0);
  const err = (k: keyof SaleValues) => ({ error: !!errors[k], helperText: errors[k]?.message });
  const blocked = disabled || stock <= 0 || isPending || uploading;

  // Cliente que ya compró: se llenan sus datos (y se pueden corregir).
  const fillCustomer = (c: CustomerDoc) => {
    const opts = { shouldValidate: true, shouldDirty: true } as const;
    setValue("buyerName", c.name ?? "", opts);
    setValue("buyerEmail", c.email ?? "", opts);
    setValue("buyerPhone", c.phone ?? "", opts);
    setValue("buyerDocument", c.document ?? "", opts);
    setValue("addressLine1", c.address?.line1 ?? "");
    setValue("cityId", c.address?.city ? String(c.address.city) : "");
  };

  return (
    <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={2.5}>
        {stock > 1 && (
          <TextField
            label="Cantidad"
            type="number"
            sx={{ maxWidth: 140 }}
            slotProps={{ htmlInput: { min: 1, max: stock, inputMode: "numeric" } }}
            {...register("qty", { valueAsNumber: true })}
            {...err("qty")}
          />
        )}

        <Section title="Método de pago">
          <Controller
            control={control}
            name="method"
            render={({ field }) => (
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={field.value}
                onChange={(_, v) => v && field.onChange(v)}
              >
                {CAJA_METHODS.map((m) => {
                  const Icon = METHOD_ICON[m.value];
                  return (
                    <ToggleButton key={m.value} value={m.value} sx={{ py: 1.5, gap: 1, textTransform: "none", flexDirection: { xs: "column", sm: "row" } }}>
                      <Icon size={20} /> {m.label}
                    </ToggleButton>
                  );
                })}
              </ToggleButtonGroup>
            )}
          />
          {method === "card_offline" && (
            <TextField label="N.º de aprobación del voucher (opcional)" slotProps={{ htmlInput: { inputMode: "numeric" } }} {...register("authCode")} />
          )}
          {method === "whatsapp" && (
            <Controller
              control={control}
              name="receiptUrl"
              render={({ field }) => <ReceiptInput value={field.value} onChange={field.onChange} onUploading={setUploading} />}
            />
          )}
        </Section>

        <Section title="Comprador">
          <CustomerPicker onPick={fillCustomer} />
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            <TextField label="Nombre completo" autoComplete="off" {...register("buyerName")} {...err("buyerName")} />
            <TextField label="Correo" type="email" slotProps={{ htmlInput: { inputMode: "email" } }} {...register("buyerEmail")} {...err("buyerEmail")} />
            <TextField label="Teléfono" type="tel" slotProps={{ htmlInput: { inputMode: "tel" } }} {...register("buyerPhone")} {...err("buyerPhone")} />
            <TextField label="Cédula / NIT (opcional)" {...register("buyerDocument")} />
          </Box>
        </Section>

        <Section title="Entrega">
          <Controller
            control={control}
            name="delivery"
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                label={field.value ? "Enviar a domicilio" : "Se la lleva en la feria"}
              />
            )}
          />
          <Collapse in={delivery} unmountOnExit>
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1.3fr 1fr" } }}>
              <TextField label="Dirección" {...register("addressLine1")} {...err("addressLine1")} />
              <Controller
                control={control}
                name="cityId"
                render={({ field }) => (
                  <Autocomplete
                    options={cities}
                    getOptionLabel={(c) => c.name}
                    value={cities.find((c) => String(c._id ?? c.id) === field.value) ?? null}
                    onChange={(_, c) => field.onChange(c ? String(c._id ?? c.id) : "")}
                    renderInput={(p) => <TextField {...p} label="Ciudad" {...err("cityId")} />}
                  />
                )}
              />
              <TextField label="Indicaciones de entrega" sx={{ gridColumn: "1 / -1" }} {...register("notes")} />
            </Box>
          </Collapse>
        </Section>

        <Section title="Apartar">
          <Controller
            control={control}
            name="apartar"
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                label="Apartar con abono (paga el resto después)"
              />
            )}
          />
          <Collapse in={apartar} unmountOnExit>
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              <TextField
                label="Abono hoy (COP)"
                type="number"
                slotProps={{ htmlInput: { min: 0, inputMode: "numeric" } }}
                {...register("abono", { valueAsNumber: true })}
                {...err("abono")}
              />
              <TextField label="Paga el resto antes de" type="date" slotProps={{ inputLabel: { shrink: true } }} {...register("dueDate")} />
            </Box>
          </Collapse>
        </Section>

        {/* Total y botón quedan pegados abajo en el celular. */}
        <Box
          sx={{
            position: "sticky",
            bottom: 0,
            mx: -2,
            px: 2,
            py: 1.5,
            bgcolor: "background.paper",
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">
              {apartar ? `Total ${formatCOP(total)} · abona hoy` : "Total a cobrar"}
            </Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 300, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
              {formatCOP(apartar ? Number(abono) || 0 : total)}
            </Typography>
          </Box>
          <Button type="submit" variant="contained" color="secondary" size="large" disabled={blocked} sx={{ minHeight: 52, px: 3 }}>
            {isPending ? "Registrando…" : uploading ? "Subiendo foto…" : apartar ? "Apartar" : "Cobrar"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
