"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Collapse,
  FormControlLabel,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Banknote, ChevronDown, CreditCard, Landmark } from "lucide-react";
import { toast } from "sonner";
import { formatCOP } from "@/utils/money";
import type { CityDoc } from "@services/city.service";
import type { CustomerDoc } from "@services/orders.service";
import { CustomerPicker } from "./CustomerPicker";
import { ReceiptInput } from "./ReceiptInput";
import { stockOf, type CajaArtwork } from "../model/artwork";
import { CAJA_METHODS, SALE_DEFAULTS, saleSchemaFor, type SaleValues } from "../model/sale";

const METHOD_ICON = { cash: Banknote, card_offline: CreditCard, whatsapp: Landmark } as const;

const norm = (s?: string | null) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Un paso con número grande: se lee de arriba abajo, sin pensar qué sigue. */
const Step = ({ n, title, children }: { n: number; title: string; children: ReactNode }) => (
  <Stack spacing={1.5}>
    <Stack direction="row" alignItems="center" spacing={1.25}>
      <Box sx={{ flex: "none", width: { xs: 34, sm: 24 }, height: { xs: 34, sm: 24 }, borderRadius: "50%", bgcolor: "text.primary", color: "background.default", display: "grid", placeItems: "center", fontSize: { xs: 18, sm: 13 }, fontWeight: 600 }}>
        {n}
      </Box>
      <Typography sx={{ fontSize: { xs: 22, sm: 16 }, fontWeight: 500 }}>{title}</Typography>
    </Stack>
    {children}
  </Stack>
);

/** Formulario de cobro. Se monta de nuevo en cada venta, así arranca limpio. */
export function SaleForm({
  artwork,
  cities,
  disabled,
  canLayaway,
  isPending,
  onSubmit,
}: {
  artwork: CajaArtwork;
  cities: CityDoc[];
  disabled?: boolean;
  /** Apartar con abono: solo jefe de caja / admin. */
  canLayaway?: boolean;
  isPending: boolean;
  onSubmit: (values: SaleValues) => void;
}) {
  const listPrice = Number(artwork.price ?? 0);
  const schema = useMemo(() => saleSchemaFor(listPrice), [listPrice]);
  const { control, register, handleSubmit, setValue, formState: { errors } } = useForm<SaleValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...SALE_DEFAULTS, price: listPrice },
    mode: "onTouched",
  });
  const [method, apartar, qty, abono, price] = useWatch({
    control,
    name: ["method", "apartar", "qty", "abono", "price"],
  });

  const [uploading, setUploading] = useState(false);
  const [discountOn, setDiscountOn] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const stock = stockOf(artwork);
  const unit = discountOn ? Number(price) || 0 : listPrice;
  const total = unit * (Number(qty) || 0);
  const pctOff = discountOn && listPrice > 0 && unit > 0 && unit < listPrice ? Math.round((1 - unit / listPrice) * 100) : 0;

  const toggleDiscount = (on: boolean) => {
    setDiscountOn(on);
    // Sin descuento se cobra el precio de la obra, sin nota.
    if (!on) {
      setValue("price", listPrice, { shouldValidate: true });
      setValue("discountNote", "");
    }
  };
  const err = (k: keyof SaleValues) => ({ error: !!errors[k], helperText: errors[k]?.message });
  const blocked = disabled || stock <= 0 || isPending || uploading;

  // Persona ya conocida: se llenan sus datos y la cajera los confirma con ella.
  const fillCustomer = (c: CustomerDoc) => {
    const opts = { shouldValidate: true, shouldDirty: true } as const;
    setValue("buyerName", c.name ?? "", opts);
    setValue("buyerEmail", c.email ?? "", opts);
    setValue("buyerPhone", c.phone ?? "", opts);
    setValue("buyerDocument", c.document ?? "", opts);
    setValue("addressLine1", c.address?.line1 ?? "");
    // De entradas la ciudad llega en texto: se busca en el catálogo por nombre.
    const city = c.address?.city || (c.cityName ? cities.find((x) => norm(x.name) === norm(c.cityName))?._id : "");
    setValue("cityId", city ? String(city) : "");
    setPicked(c.name || c.email);
  };

  // Lo que falta se dice en palabras; el cursor ya salta solo al primer campo.
  const onInvalid = (e: FieldErrors<SaleValues>) => {
    if (e.price || e.discountNote || e.abono) setMoreOpen(true);
    const first = Object.values(e)[0]?.message;
    toast.error(first ? `Falta: ${first}` : "Revisa los datos marcados en rojo");
  };

  return (
    <Box
      component="form"
      noValidate
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      sx={{
        // Celular: grande para el dedo. Tablet y escritorio: compacto.
        "& .MuiInputBase-input": { fontSize: { xs: 18, sm: 14.5 }, py: { xs: 1.75, sm: 0.75 } },
        "& .MuiInputLabel-root": { fontSize: { xs: 17, sm: 12.5 } },
        "& .MuiFormHelperText-root": { fontSize: { xs: 15, sm: 12 } },
      }}
    >
      <Stack spacing={{ xs: 3.5, sm: 2.5 }}>
        {stock > 1 && (
          <TextField
            label="¿Cuántas lleva?"
            type="number"
            sx={{ maxWidth: 180 }}
            slotProps={{ htmlInput: { min: 1, max: stock, inputMode: "numeric" } }}
            {...register("qty", { valueAsNumber: true })}
            {...err("qty")}
          />
        )}

        <Step n={1} title="¿Quién compra?">
          <CustomerPicker onPick={fillCustomer} />
          {picked && (
            <Alert severity="info" sx={{ fontSize: { xs: 17, sm: 13.5 } }}>
              Pregúntale a <strong>{picked}</strong> si estos datos están bien. Si algo cambió, corrígelo aquí.
            </Alert>
          )}
          <TextField label="Nombre completo" autoComplete="off" {...register("buyerName")} {...err("buyerName")} />
          <TextField label="Correo" type="email" slotProps={{ htmlInput: { inputMode: "email" } }} {...register("buyerEmail")} {...err("buyerEmail")} />
          <Box sx={{ display: "grid", gap: 1.5, alignItems: "start", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" } }}>
            <TextField label="Teléfono" type="tel" slotProps={{ htmlInput: { inputMode: "tel" } }} {...register("buyerPhone")} {...err("buyerPhone")} />
            <TextField label="Cédula o NIT (opcional)" {...register("buyerDocument")} />
          </Box>
        </Step>

        {/* Todas las obras se entregan a domicilio: la dirección siempre se pide. */}
        <Step n={2} title="¿A dónde se la llevamos?">
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
                onBlur={field.onBlur}
                renderInput={(p) => <TextField {...p} label="Ciudad" {...err("cityId")} />}
              />
            )}
          />
        </Step>

        <Step n={3} title="¿Cómo paga?">
          <Controller
            control={control}
            name="method"
            render={({ field }) => (
              <ToggleButtonGroup exclusive orientation="vertical" fullWidth value={field.value} onChange={(_, v) => v && field.onChange(v)}>
                {CAJA_METHODS.map((m) => {
                  const Icon = METHOD_ICON[m.value];
                  return (
                    <ToggleButton
                      key={m.value}
                      value={m.value}
                      sx={{
                        py: { xs: 2, sm: 1 },
                        gap: 1.25,
                        fontSize: { xs: 19, sm: 14.5 },
                        textTransform: "none",
                        "&.Mui-selected, &.Mui-selected:hover": { bgcolor: "text.primary", color: "background.default" },
                      }}
                    >
                      <Icon size={20} /> {m.label}
                    </ToggleButton>
                  );
                })}
              </ToggleButtonGroup>
            )}
          />
          {method === "card_offline" && (
            <TextField label="Número de aprobación del voucher (opcional)" slotProps={{ htmlInput: { inputMode: "numeric" } }} {...register("authCode")} />
          )}
          {method === "whatsapp" && (
            <Controller
              control={control}
              name="receiptUrl"
              render={({ field }) => <ReceiptInput value={field.value} onChange={field.onChange} onUploading={setUploading} />}
            />
          )}
        </Step>

        {/* Lo que casi nunca se usa queda guardado: no estorba en la venta normal. */}
        <Box>
          <Button
            type="button"
            color="inherit"
            onClick={() => setMoreOpen((o) => !o)}
            endIcon={<ChevronDown size={18} style={{ transform: moreOpen ? "rotate(180deg)" : undefined }} />}
            sx={{ textTransform: "none", fontSize: { xs: 16, sm: 13.5 } }}
          >
            Descuento, apartar o indicaciones
          </Button>
          <Collapse in={moreOpen}>
            <Stack spacing={2} sx={{ mt: 1.5 }}>
              <FormControlLabel
                control={<Switch checked={discountOn} onChange={(e) => toggleDiscount(e.target.checked)} />}
                label="El artista dio descuento"
              />
              <Collapse in={discountOn} unmountOnExit>
                <Stack spacing={2}>
                  <TextField
                    label="Precio acordado (por obra)"
                    type="number"
                    slotProps={{
                      htmlInput: { min: 1, max: listPrice, inputMode: "numeric" },
                      input: { startAdornment: <InputAdornment position="start">COP</InputAdornment> },
                    }}
                    {...register("price", { valueAsNumber: true })}
                    error={!!errors.price}
                    helperText={errors.price?.message ?? (pctOff ? `${formatCOP(unit)} · ${pctOff}% de descuento` : "Menor al precio de la obra, nunca mayor")}
                  />
                  <TextField label="¿Quién lo autorizó?" placeholder="Ej: el artista, por compra de 3 obras" {...register("discountNote")} {...err("discountNote")} />
                </Stack>
              </Collapse>
              {canLayaway && (
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
              )}
              <Collapse in={!!canLayaway && apartar} unmountOnExit>
                <Stack spacing={2}>
                  <TextField
                    label="Abono de hoy"
                    type="number"
                    slotProps={{
                      htmlInput: { min: 0, inputMode: "numeric" },
                      input: { startAdornment: <InputAdornment position="start">COP</InputAdornment> },
                    }}
                    {...register("abono", { valueAsNumber: true })}
                    error={!!errors.abono}
                    helperText={errors.abono?.message ?? (Number(abono) > 0 ? `${formatCOP(abono)} · queda ${formatCOP(Math.max(0, total - Number(abono)))}` : undefined)}
                  />
                  <TextField label="Paga el resto antes de" type="date" slotProps={{ inputLabel: { shrink: true } }} {...register("dueDate")} />
                </Stack>
              </Collapse>
              <TextField label="Indicaciones de entrega (apto, horario, quién recibe)" {...register("notes")} />
            </Stack>
          </Collapse>
        </Box>

        {/* Total y botón quedan pegados abajo: siempre a la vista. */}
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
          }}
        >
          <Typography sx={{ fontSize: { xs: 16, sm: 13 } }} color="text.secondary">
            {apartar ? `Total ${formatCOP(total)} · abona hoy` : pctOff ? `Total con ${pctOff}% de descuento` : "Total a cobrar"}
          </Typography>
          <Typography sx={{ fontSize: { xs: 34, sm: 24 }, fontWeight: 400, fontVariantNumeric: "tabular-nums", lineHeight: 1.2, mb: 1 }}>
            {formatCOP(apartar ? Number(abono) || 0 : total)}
          </Typography>
          <Button type="submit" fullWidth variant="contained" color="secondary" size="large" disabled={blocked} sx={{ minHeight: { xs: 64, sm: 46 }, fontSize: { xs: 20, sm: 15 } }}>
            {isPending ? "Registrando…" : uploading ? "Subiendo foto…" : apartar ? "Apartar" : "Cobrar"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
