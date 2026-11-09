"use client";

import { useState } from "react";
import { Alert, Box, Button, Card, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import LockedNotice from "@/components/ui/LockedNotice";
import { SALES_DETAIL_ENABLED } from "@/utils/exportsLock";
import KpiStrip from "@/components/ui/KpiStrip";
import StatusPill from "@/components/ui/StatusPill";
import BulkSaleDialog from "@/app/inventory/artworks/BulkSaleDialog";
import { getArtworkById } from "@services/artworks.service";
import { CLAIM_METHOD_LABEL, listAdminTestSales, listSaleClaims, updateSaleClaim, type SaleClaim } from "@services/orders.service";
import AdminTestSales from "./AdminTestSales";
import type { CajaMethod } from "@/features/caja/model/sale";
import { formatCOP } from "@/utils/money";

/* Reclamos de venta perdida: el comprador dice "compré y no tengo confirmación"
   desde /reclamo en la tienda; el artista confirma o niega en "Mis pedidos";
   aquí se registra la venta real (venta en lote con los datos ya llenos) o se
   rechaza. Registrar baja el stock y la suma a reportes. */

const STORE = "https://feria-millon.immsai.com";
const TO_CAJA: Record<string, CajaMethod> = { efectivo: "cash", datafono: "card_offline", transferencia: "whatsapp" };
const TABS: { key: SaleClaim["status"]; label: string }[] = [
  { key: "pending", label: "Por revisar" },
  { key: "resolved", label: "Registrados" },
  { key: "rejected", label: "Rechazados" },
];

export default function Page() {
  return SALES_DETAIL_ENABLED ? <ReclamosPage /> : <LockedNotice title="Reclamos" />;
}

function ReclamosPage() {
  const [tab, setTab] = useState<SaleClaim["status"] | "admintest">("pending");
  const q = useQuery({ queryKey: ["saleClaims"], queryFn: () => listSaleClaims(), refetchInterval: 60_000 });
  const at = useQuery({ queryKey: ["adminTestSales"], queryFn: listAdminTestSales });
  const all = q.data ?? [];
  const rows = all.filter((c) => c.status === tab);

  return (
    <Box>
      <PageHeader
        crumb="Ventas"
        title="Reclamos de compra"
        description={`Ventas sin confirmación: las que reporta el comprador en ${STORE}/reclamo y las que reporta el artista desde "Mis pedidos" con el comprobante. Verifique el pago (banco o datáfono) antes de registrar.`}
      />
      <KpiStrip
        loading={q.isLoading}
        items={[
          ...TABS.map((t) => ({ label: t.label, value: all.filter((c) => c.status === t.key).length, onClick: () => setTab(t.key), selected: tab === t.key })),
          { label: "Admin Test sin cuadrar", value: (at.data ?? []).filter((o) => !o.review?.done).length, onClick: () => setTab("admintest"), selected: tab === "admintest" },
        ]}
      />
      {tab === "admintest" ? (
        <AdminTestSales />
      ) : q.isError ? (
        <Alert severity="error" sx={{ my: 2 }}>No cargaron los reclamos.</Alert>
      ) : q.isLoading ? (
        <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Box>
      ) : !rows.length ? (
        <Card sx={{ p: 4, mt: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">Nada en esta pestaña.</Typography>
        </Card>
      ) : (
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {rows.map((c) => <ClaimCard key={c.id} c={c} />)}
        </Stack>
      )}
    </Box>
  );
}

function ClaimCard({ c }: { c: SaleClaim }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(c.adminNote || "");
  const [link, setLink] = useState(c.artworkId || "");
  const [sale, setSale] = useState<{ artwork: any; eventId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["saleClaims"] });

  const close = async (status: SaleClaim["status"], orderId?: string) => {
    setBusy(true);
    try {
      await updateSaleClaim(c.id, { status, orderId, note: note.trim() || undefined });
      toast.success(status === "resolved" ? "Reclamo registrado" : status === "rejected" ? "Reclamo rechazado" : "Reclamo reabierto");
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  // Siempre se lee la obra fresca: stock, artista y feria al momento de vender.
  const openSale = async () => {
    const id = (link.match(/[0-9a-f]{24}/i) || [])[0];
    if (!id) return toast.error("Pegue el enlace o el id de la obra.");
    setBusy(true);
    try {
      const { doc } = await getArtworkById(id);
      if (!Number(doc.stock ?? 0)) toast.warning("La obra figura sin stock: puede que ya esté registrada a otra persona. Revise antes de cobrar.");
      setSale({ artwork: doc, eventId: String((doc as any).event?._id ?? (doc as any).event ?? c.event ?? "") });
    } catch {
      toast.error("No se encontró esa obra.");
    } finally {
      setBusy(false);
    }
  };

  const d = c.artist?.decision;
  const pending = c.status === "pending";
  return (
    <Card sx={{ p: 2.5 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600 }}>{c.buyer.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {[c.buyer.email, c.buyer.phone, c.buyer.document].filter(Boolean).join(" · ")}
          </Typography>
          {c.buyer.address && <Typography variant="body2" color="text.secondary">Entrega: {c.buyer.address}</Typography>}
          <Typography variant="body2" sx={{ mt: 1 }}>
            <b>{c.artwork?.title || c.artworkTitle || c.artworkText}</b>
            {c.artistName && ` — ${c.artistName}`}
            {c.artwork && ` · lista ${formatCOP(c.artwork.price)} · stock ${c.artwork.stock}`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Compró el {c.purchasedOn} · {CLAIM_METHOD_LABEL[c.method] || c.method}
            {c.amount ? ` · pagó ${formatCOP(c.amount)}` : ""}
            {(c.voucher || c.bank) && ` · comprobante ${[c.bank, c.voucher].filter(Boolean).join(" ")}`}
            {c.seller && ` · le vendió ${c.seller}`}
          </Typography>
          {c.note && <Typography variant="body2" sx={{ mt: 0.5, fontStyle: "italic" }}>“{c.note}”</Typography>}
        </Box>
        <Stack spacing={0.75} alignItems={{ xs: "flex-start", md: "flex-end" }} sx={{ flexShrink: 0 }}>
          <StatusPill
            label={c.source === "artist" ? "Reportado por el artista" : d === "confirmed" ? "Artista confirma" : d === "denied" ? "Artista niega" : c.artistId ? "Artista sin responder" : "Sin artista identificado"}
            tone={d === "confirmed" ? "ok" : d === "denied" ? "bad" : "mid"}
          />
          {c.artist?.note && <Typography variant="caption" color="text.secondary">Artista: {c.artist.note}</Typography>}
          <Typography variant="caption" color="text.secondary">Recibido {new Date(c.createdAt).toLocaleString("es-CO")}</Typography>
          {c.orderId && <Typography variant="caption">Orden #{String(c.orderId).slice(-8).toUpperCase()}</Typography>}
        </Stack>
      </Stack>

      {c.existingOrderId && pending && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          Ya hay una venta pagada de esta obra a este correo (#{String(c.existingOrderId).slice(-8).toUpperCase()}): probablemente no se perdió.
        </Alert>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }} alignItems={{ sm: "center" }}>
        {pending && !c.artworkId && (
          <TextField size="small" label="Enlace o id de la obra" value={link} onChange={(e) => setLink(e.target.value)} sx={{ minWidth: 260 }} />
        )}
        <TextField size="small" label="Nota interna" value={note} onChange={(e) => setNote(e.target.value)} fullWidth />
        {pending ? (
          <>
            {c.existingOrderId && (
              <Button disabled={busy} variant="outlined" onClick={() => close("resolved", String(c.existingOrderId))} sx={{ whiteSpace: "nowrap" }}>
                Ya estaba registrada
              </Button>
            )}
            <Button disabled={busy} variant="contained" onClick={openSale} sx={{ whiteSpace: "nowrap" }}>Registrar venta</Button>
            <Button disabled={busy} color="error" onClick={() => close("rejected")} sx={{ whiteSpace: "nowrap" }}>Rechazar</Button>
          </>
        ) : (
          <Button disabled={busy} color="inherit" onClick={() => close("pending")} sx={{ whiteSpace: "nowrap" }}>Reabrir</Button>
        )}
      </Stack>

      {sale && (
        <BulkSaleDialog
          open
          title={`Registrar venta reclamada: ${sale.artwork.title}`}
          eventId={sale.eventId}
          artworks={[sale.artwork]}
          initial={{
            name: c.buyer.name, email: c.buyer.email, phone: c.buyer.phone, document: c.buyer.document, address: c.buyer.address,
            price: c.amount && c.amount < Number(sale.artwork.price) ? String(c.amount) : "",
            method: TO_CAJA[c.method] || "whatsapp",
            receipt: c.voucher,
          }}
          onClose={() => setSale(null)}
          onDone={async (orderId) => { setSale(null); await close("resolved", orderId); }}
        />
      )}
    </Card>
  );
}
