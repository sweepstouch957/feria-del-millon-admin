"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import { Banknote, CreditCard, Landmark } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import { eyebrow } from "@/app/theme";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { getTicketDays, TICKET_TYPE_LABEL } from "@services/ticket.service";
import { formatCOP } from "@/utils/money";
import { boxOfficeError, useBoxOfficeSale } from "../hooks/useBoxOfficeSale";
import { PracticeBanner } from "@features/caja/components/PracticeBanner";
import { useCajaAccess } from "@features/caja/hooks/useCajaAccess";
import {
  BOX_OFFICE_DEFAULTS, BOX_OFFICE_METHODS, boxOfficeSchema, specOf, TICKET_TYPES, unitPrice, type BoxOfficeValues,
} from "../model/boxOffice";

const METHOD_ICON = { cash: Banknote, card_offline: CreditCard, transfer: Landmark } as const;

export function BoxOfficePage() {
  const { eventId, isLoading, isError, refetch } = useActiveEvent();
  if (!eventId) return <ActiveEventGate isLoading={isLoading} isError={isError} onRetry={refetch} />;
  return <BoxOffice eventId={eventId} />;
}

/** Venta de entradas en sitio: el asistente recibe su QR por correo al instante. */
function BoxOffice({ eventId }: { eventId: string }) {
  const { data: daysRes } = useQuery({ queryKey: ["ticketDays", eventId], queryFn: () => getTicketDays(eventId) });
  const days = useMemo(() => daysRes?.days ?? [], [daysRes]);
  const sale = useBoxOfficeSale(eventId);
  const { practice } = useCajaAccess();

  const { control, register, handleSubmit, setValue, reset, getValues, formState: { errors } } = useForm<BoxOfficeValues>({
    resolver: zodResolver(boxOfficeSchema),
    defaultValues: BOX_OFFICE_DEFAULTS,
    mode: "onTouched",
  });
  const [type, date, quantity, email] = useWatch({ control, name: ["type", "date", "quantity", "email"] });
  const spec = specOf(type);

  // Día por defecto: hoy (o el primero de la feria).
  useEffect(() => {
    if (!getValues("date") && days.length) setValue("date", days.find((d) => d.isToday)?.date || days[0].date);
  }, [days, getValues, setValue]);
  // Al cambiar de tipo, la cantidad vuelve a la mínima de ese tipo.
  useEffect(() => {
    setValue("quantity", specOf(type).quantities?.[0] ?? 1);
  }, [type, setValue]);

  const total = unitPrice({ type, quantity, date }, days.find((d) => d.date === date)?.price) * quantity;
  const err = (k: keyof BoxOfficeValues) => ({ error: !!errors[k], helperText: errors[k]?.message });

  const submit = handleSubmit((v) =>
    sale.mutate(v, {
      onSuccess: () => toast.success(practice ? "Venta de práctica lista" : `Venta registrada. QR enviado a ${v.email}`),
      onError: (e) => toast.error(boxOfficeError(e)),
    }),
  );
  const next = () => {
    sale.next();
    reset({ ...BOX_OFFICE_DEFAULTS, type: getValues("type"), date: getValues("date"), method: getValues("method") });
  };

  return (
    <Box sx={{ maxWidth: 920, mx: "auto" }}>
      <PageHeader
        crumb="Boletos"
        title="Taquilla"
        description="Venta de entradas en sitio. El asistente recibe su QR por correo al instante."
      />
      <PracticeBanner />

      <Card variant="outlined" sx={{ borderRadius: 0 }}>
        <CardContent>
          {sale.data ? (
            <Stack spacing={2}>
              {practice ? (
                <Alert severity="warning">
                  Práctica: {sale.data.tickets.length} boleta(s) de prueba. No se cobró ni se envió correo. Escanéalas en
                  &quot;Validar entradas&quot; para practicar la puerta.
                </Alert>
              ) : (
                <Alert severity="success">
                  {sale.data.tickets.length} entrada(s) · {formatCOP(total, { code: true })} · enviadas a {email}
                </Alert>
              )}
              <Stack direction="row" flexWrap="wrap" gap={2} justifyContent={{ xs: "center", sm: "flex-start" }}>
                {sale.data.tickets.map((t) => (
                  <Box key={t.id} sx={{ textAlign: "center" }}>
                    {t.qrDataUrl && <img src={t.qrDataUrl} alt={t.shortCode} width={160} height={160} />}
                    <Typography variant="caption" display="block">{t.shortCode} · {String(t.eventDay).slice(0, 10)}</Typography>
                  </Box>
                ))}
              </Stack>
              <Button autoFocus variant="contained" color="secondary" size="large" onClick={next} sx={{ minHeight: 52 }}>
                Nueva venta
              </Button>
            </Stack>
          ) : (
            <Box component="form" noValidate onSubmit={submit}>
              <Stack spacing={2.5}>
                <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1.2fr 1.4fr 0.8fr" } }}>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <TextField select label="Tipo de entrada" {...field}>
                        {TICKET_TYPES.map((t) => <MenuItem key={t.key} value={t.key}>{TICKET_TYPE_LABEL[t.key]}</MenuItem>)}
                      </TextField>
                    )}
                  />
                  {spec.pickDay ? (
                    <Controller
                      control={control}
                      name="date"
                      render={({ field }) => (
                        <TextField select label="Día" {...field} {...err("date")}>
                          {days.map((d) => (
                            <MenuItem key={d.date} value={d.date} disabled={!d.isActive || d.remaining <= 0}>
                              {d.display || d.date} · {formatCOP(d.price)} · quedan {d.remaining}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  ) : (
                    <TextField label="Día" value="Los 4 días" disabled />
                  )}
                  {spec.quantities ? (
                    <Controller
                      control={control}
                      name="quantity"
                      render={({ field }) => (
                        <TextField select label="Paquete" {...field} onChange={(e) => field.onChange(Number(e.target.value))}>
                          {spec.quantities!.map((q) => (
                            <MenuItem key={q} value={q}>{q} · {formatCOP(unitPrice({ type, quantity: q, date }) * q)}</MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  ) : (
                    <TextField
                      label="Cantidad"
                      type="number"
                      disabled={spec.maxQty === 1}
                      slotProps={{ htmlInput: { min: 1, max: 20, inputMode: "numeric" } }}
                      {...register("quantity", { valueAsNumber: true })}
                      {...err("quantity")}
                    />
                  )}
                </Box>
                {type === "2x1" && <Alert severity="info">Por cada entrada se emite otra gratis para el viernes de 12:00 a 6:00 p.m.</Alert>}
                {type === "estudiante" && <Alert severity="warning">Verifica el carné 2026 de arte, diseño o arquitectura antes de emitir.</Alert>}

                <Stack spacing={1.25}>
                  <Typography sx={{ ...eyebrow, color: "text.secondary" }}>Asistente</Typography>
                  <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" } }}>
                    <TextField label="Nombre completo" {...register("name")} {...err("name")} />
                    <TextField label="Correo (recibe el QR)" type="email" slotProps={{ htmlInput: { inputMode: "email" } }} {...register("email")} {...err("email")} />
                    <TextField label="Teléfono" type="tel" slotProps={{ htmlInput: { inputMode: "tel" } }} {...register("phone")} />
                    {type === "empresa" && <TextField label="Empresa" {...register("company")} />}
                    {type === "empresa" && <TextField label="NIT" {...register("nit")} />}
                  </Box>
                </Stack>

                <Stack spacing={1.25}>
                  <Typography sx={{ ...eyebrow, color: "text.secondary" }}>Método de pago</Typography>
                  <Controller
                    control={control}
                    name="method"
                    render={({ field }) => (
                      <ToggleButtonGroup exclusive fullWidth value={field.value} onChange={(_, v) => v && field.onChange(v)}>
                        {BOX_OFFICE_METHODS.map((m) => {
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
                </Stack>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography sx={{ flex: 1, fontSize: 26, fontWeight: 300, fontVariantNumeric: "tabular-nums" }}>
                    {formatCOP(total, { code: true })}
                  </Typography>
                  <Button type="submit" variant="contained" color="secondary" size="large" disabled={sale.isPending} sx={{ minHeight: 52, px: 3 }}>
                    {sale.isPending ? "Registrando…" : "Cobrar y emitir"}
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
