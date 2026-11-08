"use client";

import { useState } from "react";
import { Alert, Box, Button, Card, Checkbox, CircularProgress, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import StatusPill from "@/components/ui/StatusPill";
import { listAdminTestSales, reviewAdminTestSale, type AdminTestSale } from "@services/orders.service";
import { formatCOP } from "@/utils/money";

/* Ventas hechas con la cuenta compartida "Admin Test" (sin apartados), agrupadas
   por artista: se llama al artista, se pone el comprador real y se marca cuadrada. */

const METHOD: Record<string, string> = { cash: "Efectivo", card_offline: "Datáfono", whatsapp: "Transferencia", mercadopago: "Mercado Pago" };
const FAKE = /por validar|admin|test|invalid|porvalidar|sincorre/i;

export default function AdminTestSales() {
  const q = useQuery({ queryKey: ["adminTestSales"], queryFn: listAdminTestSales });
  const [onlyOpen, setOnlyOpen] = useState(true);
  if (q.isLoading) return <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Box>;
  if (q.isError) return <Alert severity="error" sx={{ my: 2 }}>No cargaron las ventas de Admin Test.</Alert>;

  const all = q.data ?? [];
  const rows = onlyOpen ? all.filter((o) => !o.review?.done) : all;
  const groups = new Map<string, AdminTestSale[]>();
  for (const o of rows) {
    const k = o.items.map((i) => i.artistName || "(sin artista)").filter((v, i, a) => a.indexOf(v) === i).join(" + ");
    groups.set(k, [...(groups.get(k) || []), o]);
  }
  const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "es"));
  const done = all.filter((o) => o.review?.done).length;

  return (
    <Box sx={{ mt: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap">
        <Typography variant="body2" color="text.secondary">
          {all.length} ventas · {formatCOP(all.reduce((s, o) => s + o.total, 0))} · {done} cuadradas · {sorted.length} artistas en la lista
        </Typography>
        <FormControlLabel control={<Checkbox size="small" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />} label="Solo sin cuadrar" />
      </Stack>
      {!rows.length ? (
        <Card sx={{ p: 4, textAlign: "center" }}><Typography variant="body2" color="text.secondary">Nada pendiente.</Typography></Card>
      ) : (
        <Stack spacing={2}>
          {sorted.map(([artist, list]) => (
            <Card key={artist} sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 600 }}>{artist}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {list[0].items[0]?.artistEmail} · {list.length} {list.length === 1 ? "venta" : "ventas"} · {formatCOP(list.reduce((s, o) => s + o.total, 0))}
              </Typography>
              <Stack spacing={1.5} divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
                {list.map((o) => <SaleRow key={o.id} o={o} />)}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}

function SaleRow({ o }: { o: AdminTestSale }) {
  const qc = useQueryClient();
  const fake = (s: string) => !s || FAKE.test(s);
  const [name, setName] = useState(fake(o.buyer.name) ? "" : o.buyer.name);
  const [email, setEmail] = useState(fake(o.buyer.email) ? "" : o.buyer.email);
  const [phone, setPhone] = useState(o.buyer.phone || "");
  const [note, setNote] = useState(o.review?.note || "");
  const [busy, setBusy] = useState(false);

  const save = async (doneFlag: boolean) => {
    setBusy(true);
    try {
      await reviewAdminTestSale(o.id, { name: name.trim() || undefined, email: email.trim() || undefined, phone: phone.trim() || undefined, done: doneFlag, note: note.trim() || undefined });
      toast.success(doneFlag ? "Venta cuadrada" : "Guardado");
      qc.invalidateQueries({ queryKey: ["adminTestSales"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.error === "email_invalid" ? "Correo inválido" : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2">
            <b>{o.items.map((i) => i.title).join(", ")}</b> · {formatCOP(o.total)} · {METHOD[o.method] || o.method}
            {o.authCode && ` · aprobación ${o.authCode}`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date(o.paidAt).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" })}
            {" · comprador actual: "}{[o.buyer.name, o.buyer.email].filter(Boolean).join(" · ") || "—"}
            {" · orden #"}{o.id.slice(-8).toUpperCase()}
          </Typography>
        </Box>
        <StatusPill label={o.review?.done ? "Cuadrada" : "Sin cuadrar"} tone={o.review?.done ? "ok" : "mid"} />
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }} alignItems={{ sm: "center" }}>
        <TextField size="small" label="Comprador real" value={name} onChange={(e) => setName(e.target.value)} sx={{ minWidth: 180 }} />
        <TextField size="small" label="Correo" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ minWidth: 200 }} />
        <TextField size="small" label="Celular" value={phone} onChange={(e) => setPhone(e.target.value)} sx={{ minWidth: 130 }} />
        <TextField size="small" label="Nota (qué dijo el artista)" value={note} onChange={(e) => setNote(e.target.value)} fullWidth />
        <Button disabled={busy} variant="outlined" onClick={() => save(!!o.review?.done)} sx={{ whiteSpace: "nowrap" }}>Guardar</Button>
        {o.review?.done ? (
          <Button disabled={busy} color="inherit" onClick={() => save(false)} sx={{ whiteSpace: "nowrap" }}>Reabrir</Button>
        ) : (
          <Button disabled={busy} variant="contained" onClick={() => save(true)} sx={{ whiteSpace: "nowrap" }}>Cuadrada</Button>
        )}
      </Stack>
    </Box>
  );
}
