"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
} from "@mui/material";
import { QrCode, Printer, RefreshCw } from "lucide-react";
import QRCode from "qrcode";
import { useArtworksCursor } from "@/hooks/useArtworksCursor";
import { useEvents } from "@/hooks/useEvents";

const money = (n?: number, currency = "COP") =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency, currencyDisplay: "code", maximumFractionDigits: 0 }).format(Number(n || 0));

const DEFAULT_SHOP =
  (process.env.NEXT_PUBLIC_SHOP_URL as string | undefined) || "https://feriadelmillon.com";

export default function ArtworksQrPage() {
  const eventsQuery = useEvents();
  const [event, setEvent] = React.useState<string>("");
  const [shopUrl, setShopUrl] = React.useState<string>(DEFAULT_SHOP);
  const [qrById, setQrById] = React.useState<Record<string, string>>({});
  const [building, setBuilding] = React.useState(false);

  const { rows, isLoading, hasNextPage, loadMore, isFetchingNextPage } = useArtworksCursor({
    event: event || undefined,
    limit: 60,
  });

  // Auto-cargar todas las páginas (para imprimir todo).
  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) loadMore();
  }, [hasNextPage, isFetchingNextPage, loadMore]);

  const base = shopUrl.replace(/\/+$/, "");
  const urlFor = (id: string) => `${base}/obra/${id}`;

  // Generar los QR (data URLs) cuando cambian obras o base.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!rows.length) return;
      setBuilding(true);
      const out: Record<string, string> = {};
      for (const a of rows as any[]) {
        const id = a.id || a._id;
        if (!id) continue;
        try {
          out[id] = await QRCode.toDataURL(urlFor(id), { width: 320, margin: 1, errorCorrectionLevel: "M" });
        } catch { /* skip */ }
      }
      if (!cancelled) { setQrById(out); setBuilding(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, base]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3} className="no-print">
        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(63,164,110,0.14)", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <QrCode size={20} />
        </Box>
        <Box flex={1}>
          <Typography fontWeight={900} fontSize={20}>QR de obras (para imprimir)</Typography>
          <Typography variant="caption" color="text.secondary">
            Cada QR lleva a la ficha de la obra en la tienda → compra en línea (antes, durante y después de la feria).
          </Typography>
        </Box>
        <Button variant="contained" disableElevation startIcon={<Printer size={16} />} onClick={() => window.print()}
          sx={{ textTransform: "none", bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" } }}>
          Imprimir
        </Button>
      </Stack>

      <Card sx={{ borderRadius: 3, mb: 3 }} className="no-print"><CardContent>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Evento</InputLabel>
            <Select value={event} label="Evento" onChange={(e) => setEvent(e.target.value)}>
              <MenuItem value=""><em>Todos</em></MenuItem>
              {(eventsQuery.data ?? []).map((ev: any) => (
                <MenuItem key={ev.id} value={ev.id}>{ev.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField size="small" label="URL de la tienda (base)" value={shopUrl}
            onChange={(e) => setShopUrl(e.target.value)} fullWidth
            helperText="El QR apunta a  {tienda}/obra/{id}" />
          <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => setShopUrl((s) => s)} sx={{ textTransform: "none" }}>
            Regenerar
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          {isLoading ? "Cargando obras…" : `${rows.length} obras`} {building ? "· generando QR…" : ""}
        </Typography>
      </CardContent></Card>

      {isLoading ? (
        <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Box>
      ) : (
        <Box className="qr-grid">
          {(rows as any[]).map((a) => {
            const id = a.id || a._id;
            const qr = qrById[id];
            const artist = a.artistInfo ? `${a.artistInfo.firstName ?? ""} ${a.artistInfo.lastName ?? ""}`.trim() : "";
            return (
              <div key={id} className="qr-label">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt={`QR ${a.title}`} width={150} height={150} />
                ) : (
                  <div style={{ width: 150, height: 150, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 11 }}>generando…</div>
                )}
                <div className="qr-title">{a.title || "Sin título"}</div>
                {artist && <div className="qr-artist">{artist}</div>}
                <div className="qr-price">{money(a.price, a.currency)}</div>
                <div className="qr-id">Escanea para comprar en línea</div>
              </div>
            );
          })}
        </Box>
      )}

      <style jsx global>{`
        .qr-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 12px;
        }
        .qr-label {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 14px;
          text-align: center;
          background: #fff;
          break-inside: avoid;
        }
        .qr-label img { display: block; margin: 0 auto; }
        .qr-title { font-weight: 800; font-size: 13px; margin-top: 8px; color: #111; }
        .qr-artist { font-size: 11px; color: #666; margin-top: 2px; }
        .qr-price { font-size: 12px; font-weight: 700; color: #16a34a; margin-top: 4px; }
        .qr-id { font-size: 9px; color: #999; margin-top: 4px; text-transform: uppercase; letter-spacing: .06em; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
          .qr-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .qr-label { border-color: #ccc; }
        }
      `}</style>
    </Box>
  );
}
