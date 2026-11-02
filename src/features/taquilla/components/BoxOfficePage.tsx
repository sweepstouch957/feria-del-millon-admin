"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import { Banknote, CreditCard, Landmark, Minus, Plus } from "lucide-react";
import type { Ticket } from "@services/ticket.service";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { toast } from "sonner";
import { SHOP_URL } from "@core/constants";
import PageHeader from "@/components/ui/PageHeader";
import { eyebrow } from "@/app/theme";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { getTicketDays, TICKET_TYPE_LABEL } from "@services/ticket.service";
import { formatCOP } from "@/utils/money";
import { boxOfficeError, useBoxOfficeSale } from "../hooks/useBoxOfficeSale";
import { TicketSalesSummary } from "./TicketSalesSummary";
import { PracticeBanner } from "@features/caja/components/PracticeBanner";
import { useCajaAccess } from "@features/caja/hooks/useCajaAccess";
import {
  BOX_OFFICE_DEFAULTS, BOX_OFFICE_METHODS, boxOfficeSchema, specOf, TICKET_TYPES, unitPrice, type BoxOfficeValues,
} from "../model/boxOffice";

const METHOD_ICON = { cash: Banknote, card_offline: CreditCard, transfer: Landmark } as const;
// Un toque completa el dominio: la mayoría de correos en la fila son de estos.
const EMAIL_DOMAINS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com"];

type LastSale = { tickets: Ticket[]; email: string; total: number; practice: boolean };

/** QR para imprimir en la fila: abre la entrada del día en el celular de cada persona. */
const downloadQuickQr = async () => {
  const a = document.createElement("a");
  a.href = await QRCode.toDataURL(`${SHOP_URL.replace(/\/+$/, "")}/entrada`, { width: 1500, margin: 2, errorCorrectionLevel: "M" });
  a.download = "qr-entrada-del-dia.png";
  a.click();
};

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

  const { control, register, handleSubmit, setValue, setFocus, reset, getValues, formState: { errors } } = useForm<BoxOfficeValues>({
    resolver: zodResolver(boxOfficeSchema),
    defaultValues: BOX_OFFICE_DEFAULTS,
    mode: "onTouched",
  });
  const [type, date, quantity] = useWatch({ control, name: ["type", "date", "quantity"] });
  const spec = specOf(type);

  // Día por defecto: hoy (o el primero de la feria).
  useEffect(() => {
    if (!getValues("date") && days.length) setValue("date", days.find((d) => d.isToday)?.date || days[0].date);
  }, [days, getValues, setValue]);
  // Al cambiar de tipo, la cantidad vuelve a 1.
  useEffect(() => {
    setValue("quantity", 1);
  }, [type, setValue]);

  const total = unitPrice({ type, quantity, date }, days.find((d) => d.date === date)?.price) * quantity;
  const err = (k: keyof BoxOfficeValues) => ({ error: !!errors[k], helperText: errors[k]?.message });

  // Fila rápida: al cobrar, el formulario queda limpio y listo para el siguiente
  // (mismo tipo, día y método) con el cursor en el nombre; la venta anterior
  // queda arriba como resumen. Sin pantalla intermedia ni botón "Nueva venta".
  const [last, setLast] = useState<LastSale | null>(null);
  const [showQr, setShowQr] = useState(false);
  useEffect(() => setFocus("name"), [setFocus]);

  const submit = handleSubmit((v) =>
    sale.mutate(v, {
      onSuccess: (res) => {
        setLast({ tickets: res.tickets, email: v.email, total, practice });
        setShowQr(practice); // en práctica los QR se escanean en "Validar entradas"
        sale.next();
        reset({ ...BOX_OFFICE_DEFAULTS, type: v.type, date: v.date, method: v.method, quantity: 1 });
        setTimeout(() => setFocus("name"), 0);
        toast.success(practice ? "Venta de práctica lista" : `Venta registrada. QR enviado a ${v.email}`);
      },
      onError: (e) => toast.error(boxOfficeError(e)),
    }),
  );
  const step = (d: number) => setValue("quantity", Math.min(20, Math.max(1, (Number(getValues("quantity")) || 1) + d)), { shouldValidate: true });
  // "ana" + gmail.com → ana@gmail.com (reemplaza lo que hubiera después de la @).
  const completeEmail = (domain: string) => {
    const user = String(getValues("email") || "").split("@")[0].trim();
    if (user) setValue("email", `${user}@${domain}`, { shouldValidate: true });
    setFocus("email");
  };

  return (
    <Box sx={{ maxWidth: 920, mx: "auto" }}>
      <PageHeader
        crumb="Boletos"
        title="Taquilla"
        description="Venta de entradas en sitio. Varias personas = un solo correo con un QR por persona. Enter cobra y deja lista la siguiente venta."
        actions={[{ label: "Descargar QR para imprimir", kind: "sec", onClick: downloadQuickQr }]}
      />
      <PracticeBanner />

      <Card variant="outlined" sx={{ borderRadius: 0 }}>
        <CardContent>
          {last && (
            <Box sx={{ mb: 2.5 }}>
              <Alert
                severity={last.practice ? "warning" : "success"}
                action={
                  <Button color="inherit" size="small" onClick={() => setShowQr((s) => !s)}>
                    {showQr ? "Ocultar QR" : "Ver QR"}
                  </Button>
                }
              >
                {last.practice
                  ? `Práctica: ${last.tickets.length} boleta(s) de prueba. No se cobró ni se envió correo. Escanéalas en "Validar entradas".`
                  : `Última venta: ${last.tickets.length} entrada(s) · ${formatCOP(last.total, { code: true })} · QR enviados a ${last.email}`}
              </Alert>
              {/* Si el correo no le llega (mal escrito, sin datos), puede tomarle foto a la pantalla. */}
              {showQr && (
                <Stack direction="row" flexWrap="wrap" gap={2} mt={1.5} justifyContent={{ xs: "center", sm: "flex-start" }}>
                  {last.tickets.map((t) => (
                    <Box key={t.id} sx={{ textAlign: "center" }}>
                      {t.qrDataUrl && <img src={t.qrDataUrl} alt={t.shortCode} width={160} height={160} />}
                      <Typography variant="caption" display="block">{t.shortCode} · {String(t.eventDay).slice(0, 10)}</Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          )}
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
                  {/* −/+ grandes: una familia de 5 son 4 toques, sin teclado. */}
                  <Stack direction="row" alignItems="flex-start" spacing={0.5}>
                    <Button variant="outlined" tabIndex={-1} aria-label="Una menos" disabled={quantity <= 1} onClick={() => step(-1)} sx={{ minWidth: 48, height: 56 }}>
                      <Minus size={18} />
                    </Button>
                    <TextField
                      label="Cantidad"
                      type="number"
                      slotProps={{ htmlInput: { min: 1, max: 20, inputMode: "numeric", style: { textAlign: "center" } } }}
                      {...register("quantity", { valueAsNumber: true })}
                      {...err("quantity")}
                    />
                    <Button variant="outlined" tabIndex={-1} aria-label="Una más" disabled={quantity >= 20} onClick={() => step(1)} sx={{ minWidth: 48, height: 56 }}>
                      <Plus size={18} />
                    </Button>
                  </Stack>
                </Box>

                <Stack spacing={1.25}>
                  <Typography sx={{ ...eyebrow, color: "text.secondary" }}>Asistente</Typography>
                  <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" } }}>
                    <TextField label="Nombre completo" {...register("name")} {...err("name")} />
                    <Box>
                      <TextField fullWidth label={quantity > 1 ? `Correo (recibe los ${quantity} QR)` : "Correo (recibe el QR)"} type="email" autoComplete="off" slotProps={{ htmlInput: { inputMode: "email", autoCapitalize: "none" } }} {...register("email")} {...err("email")} />
                      <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.75}>
                        {EMAIL_DOMAINS.map((d) => (
                          <Button key={d} size="small" variant="text" tabIndex={-1} onClick={() => completeEmail(d)} sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: 11, textTransform: "none" }}>
                            @{d}
                          </Button>
                        ))}
                      </Stack>
                    </Box>
                    <TextField label="Teléfono" type="tel" slotProps={{ htmlInput: { inputMode: "tel" } }} {...register("phone")} />
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
        </CardContent>
      </Card>
      <TicketSalesSummary eventId={eventId} />
    </Box>
  );
}
