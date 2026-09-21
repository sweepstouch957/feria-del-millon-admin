"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, Button, TextField, MenuItem, ToggleButton, ToggleButtonGroup, Alert,
} from "@mui/material";
import { Ticket as TicketIcon, Banknote, CreditCard } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DEFAULT_EVENT_ID } from "@core/constants";
import {
  getTicketDays, sellAtBoxOffice, TICKET_TYPE_LABEL, type BoxOfficeSaleInput, type Ticket,
} from "@services/ticket.service";
import { formatCOP } from "@/utils/money";

type SellType = BoxOfficeSaleInput["type"];
// Espejo de TICKET_TYPES (tickets-svc/utils/pricing.js). El backend es quien cobra.
const TYPES: { key: SellType; price?: number; pickDay?: boolean; quantities?: number[]; maxQty?: number }[] = [
  { key: "general", pickDay: true },
  { key: "allpass", price: 80000 },
  { key: "preview", price: 100000 },
  { key: "2x1", pickDay: true },
  { key: "estudiante", price: 0, pickDay: true, maxQty: 1 },
  { key: "empresa", price: 64000, quantities: [50, 100] },
];

const EMPTY = { name: "", email: "", phone: "", company: "", nit: "" };

export default function BoxOfficePage() {
  const eventId = DEFAULT_EVENT_ID;
  const qc = useQueryClient();
  const { data: daysRes } = useQuery({ queryKey: ["ticketDays", eventId], queryFn: () => getTicketDays(eventId) });
  const days = daysRes?.days || [];

  const [type, setType] = React.useState<SellType>("general");
  const [date, setDate] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [method, setMethod] = React.useState<"cash" | "card_offline">("cash");
  const [buyer, setBuyer] = React.useState(EMPTY);
  const [sold, setSold] = React.useState<Ticket[] | null>(null);
  const idemRef = React.useRef<string>(crypto.randomUUID());

  const spec = TYPES.find((t) => t.key === type)!;
  React.useEffect(() => {
    if (!date && days.length) setDate(days.find((d) => d.isToday)?.date || days[0].date);
  }, [days, date]);
  React.useEffect(() => {
    setQuantity(spec.quantities ? spec.quantities[0] : 1);
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const unit = spec.price ?? days.find((d) => d.date === date)?.price ?? 0;
  const total = unit * quantity;
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setBuyer((b) => ({ ...b, [k]: e.target.value }));

  const sale = useMutation({
    mutationFn: () =>
      sellAtBoxOffice({
        eventId,
        type,
        date: spec.pickDay ? date : undefined,
        quantity,
        method,
        idempotencyKey: idemRef.current,
        buyer: {
          name: buyer.name.trim(),
          email: buyer.email.trim(),
          phone: buyer.phone.trim() || undefined,
          company: type === "empresa" ? buyer.company.trim() || undefined : undefined,
          nit: type === "empresa" ? buyer.nit.trim() || undefined : undefined,
        },
      }),
    onSuccess: (r) => {
      setSold(r.tickets);
      toast.success(`Venta registrada. QR enviado a ${buyer.email}`);
      qc.invalidateQueries({ queryKey: ["ticketDays", eventId] });
    },
    onError: (e: any) => {
      const code = e?.response?.data?.error;
      toast.error(
        code === "capacity_reached" ? "No hay cupo disponible."
          : code === "student_ticket_already_issued" ? "Este correo ya tiene entrada de estudiante."
            : code === "invalid_quantity" ? "Cantidad no válida para este tipo."
              : "No se pudo registrar la venta.",
      );
    },
  });

  const next = () => {
    setSold(null);
    setBuyer(EMPTY);
    idemRef.current = crypto.randomUUID();
  };

  const valid = buyer.name.trim() && /\S+@\S+\.\S+/.test(buyer.email) && (!spec.pickDay || date) && quantity >= 1;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: "auto" }}>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
        <Box sx={{ width: 40, height: 40, bgcolor: "rgba(63,164,110,0.14)", color: "#3FA46E", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <TicketIcon size={20} />
        </Box>
        <Box>
          <Typography fontWeight={500} fontSize={20}>Taquilla</Typography>
          <Typography variant="caption" color="text.secondary">Venta de entradas en sitio. El asistente recibe su QR por correo al instante.</Typography>
        </Box>
      </Stack>

      {sold ? (
        <Card sx={{ borderRadius: 0 }}><CardContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            {sold.length} entrada(s) emitidas · {formatCOP(total, { code: true })} · enviadas a {buyer.email}
          </Alert>
          <Stack direction="row" flexWrap="wrap" gap={2} mb={2}>
            {sold.map((t) => (
              <Box key={t.id} sx={{ textAlign: "center" }}>
                {t.qrDataUrl && <img src={t.qrDataUrl} alt={t.shortCode} width={160} height={160} />}
                <Typography variant="caption" display="block">{t.shortCode} · {String(t.eventDay).slice(0, 10)}</Typography>
              </Box>
            ))}
          </Stack>
          <Button variant="contained" onClick={next} sx={{ textTransform: "none" }}>Nueva venta</Button>
        </CardContent></Card>
      ) : (
        <Card sx={{ borderRadius: 0 }}><CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField select size="small" label="Tipo de entrada" value={type} onChange={(e) => setType(e.target.value as SellType)} sx={{ flex: 1 }}>
                {TYPES.map((t) => <MenuItem key={t.key} value={t.key}>{TICKET_TYPE_LABEL[t.key]}</MenuItem>)}
              </TextField>
              {spec.pickDay && (
                <TextField select size="small" label="Día" value={date} onChange={(e) => setDate(e.target.value)} sx={{ flex: 1 }}>
                  {days.map((d) => (
                    <MenuItem key={d.date} value={d.date} disabled={!d.isActive || d.remaining <= 0}>
                      {d.display || d.date} · {formatCOP(d.price)} · quedan {d.remaining}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {spec.quantities ? (
                <TextField select size="small" label="Cantidad" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} sx={{ width: 140 }}>
                  {spec.quantities.map((q) => <MenuItem key={q} value={q}>{q}</MenuItem>)}
                </TextField>
              ) : (
                <TextField size="small" type="number" label="Cantidad" value={quantity} disabled={spec.maxQty === 1}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} sx={{ width: 140 }} />
              )}
            </Stack>
            {type === "2x1" && <Alert severity="info" sx={{ py: 0 }}>Por cada entrada se emite otra gratis para el viernes de 12:00 a 6:00 p.m.</Alert>}
            {type === "estudiante" && <Alert severity="warning" sx={{ py: 0 }}>Verifica el carné 2026 de arte, diseño o arquitectura antes de emitir.</Alert>}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField size="small" label="Nombre completo" value={buyer.name} onChange={set("name")} sx={{ flex: 1 }} required />
              <TextField size="small" type="email" label="Correo (recibe el QR)" value={buyer.email} onChange={set("email")} sx={{ flex: 1 }} required />
              <TextField size="small" label="Teléfono" value={buyer.phone} onChange={set("phone")} sx={{ flex: 1 }} />
            </Stack>
            {type === "empresa" && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField size="small" label="Empresa" value={buyer.company} onChange={set("company")} sx={{ flex: 1 }} />
                <TextField size="small" label="NIT" value={buyer.nit} onChange={set("nit")} sx={{ flex: 1 }} />
              </Stack>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
              <ToggleButtonGroup exclusive size="small" value={method} onChange={(_, v) => v && setMethod(v)}>
                <ToggleButton value="cash" sx={{ textTransform: "none", gap: 1 }}><Banknote size={16} /> Efectivo</ToggleButton>
                <ToggleButton value="card_offline" sx={{ textTransform: "none", gap: 1 }}><CreditCard size={16} /> Datáfono</ToggleButton>
              </ToggleButtonGroup>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography fontWeight={500} fontSize={22}>{formatCOP(total, { code: true })}</Typography>
                <Button variant="contained" disabled={!valid || sale.isPending} onClick={() => sale.mutate()} sx={{ textTransform: "none" }}>
                  {sale.isPending ? "Registrando…" : "Cobrar y emitir"}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </CardContent></Card>
      )}
    </Box>
  );
}
