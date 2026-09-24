"use client";

import * as React from "react";
import {
  Autocomplete,
  Box, Card, CardContent, Typography, Stack, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
} from "@mui/material";
import { QrCode, Printer, RefreshCw } from "lucide-react";
import QRCode from "qrcode";
import { useArtworksCursor } from "@/hooks/useArtworksCursor";
import { useEvents } from "@/hooks/useEvents";
import { usePavilions } from "@/hooks/usePavilions";
import { listUsers } from "@services/user.service";
import { useQuery } from "@tanstack/react-query";
import { formatCOP } from "@/utils/money";

const money = (n?: number, currency = "COP") => formatCOP(n, { code: true, currency });

const DEFAULT_SHOP =
  (process.env.NEXT_PUBLIC_SHOP_URL as string | undefined) || "https://feriadelmillon.com";

export default function ArtworksQrPage() {
  const eventsQuery = useEvents();
  const [event, setEvent] = React.useState<string>("");
  const [shopUrl, setShopUrl] = React.useState<string>(DEFAULT_SHOP);
  const [pavilion, setPavilion] = React.useState("");
  const [artist, setArtist] = React.useState<{ id: string; label: string } | null>(null);
  const [artistQ, setArtistQ] = React.useState("");
  const [qrById, setQrById] = React.useState<Record<string, string>>({});

  // Imprimir por stand: los rótulos se arman por pabellón o por artista.
  const { data: pavilions = [] } = usePavilions(event || undefined);
  const { data: artistOpts = [] } = useQuery({
    queryKey: ["users", "qr-artist", artistQ],
    queryFn: async () =>
      (await listUsers({ q: artistQ, limit: 20 })).users.map((u: any) => ({
        id: String(u.id),
        label: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
      })),
    enabled: artistQ.trim().length >= 2,
    staleTime: 60_000,
  });
  const [building, setBuilding] = React.useState(false);

  const { rows, isLoading, hasNextPage, loadMore, isFetchingNextPage } = useArtworksCursor({
    event: event || undefined,
    pavilion: pavilion || undefined,
    artist: artist?.id,
    limit: 60,
  });

  // Auto-cargar todas las páginas (para imprimir todo).
  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) loadMore();
  }, [hasNextPage, isFetchingNextPage, loadMore]);

  const base = shopUrl.replace(/\/+$/, "");
  const urlFor = (id: string) => `${base}/obra/${id}`;

  // Clave estable de las obras: depender del arreglo en sí ataba el efecto a
  // la identidad del objeto, no a su contenido. Con los ids concatenados el
  // efecto solo vuelve a correr si de verdad cambió el conjunto de obras.
  const rowsKey = React.useMemo(
    () => (rows as any[]).map((a) => a.id || a._id).filter(Boolean).join(","),
    [rows]
  );

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
    // rowsKey en lugar de rows: ver la nota de arriba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsKey, base]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Stack direction="row" flexWrap="wrap" alignItems="center" spacing={1.5} mb={3} className="no-print">
        <Box sx={{ width: 40, height: 40, borderRadius: 0, bgcolor: "rgba(63,164,110,0.14)", color: "#3FA46E", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <QrCode size={20} />
        </Box>
        <Box flex={1}>
          <Typography fontWeight={500} fontSize={20}>QR de obras (para imprimir)</Typography>
          <Typography variant="caption" color="text.secondary">
            Un QR por obra: lleva a su ficha con botón de compra. Filtra por pabellón o artista para imprimir los rótulos de cada stand.
          </Typography>
        </Box>
        <Button variant="contained" disableElevation startIcon={<Printer size={16} />} onClick={() => window.print()}
          sx={{ textTransform: "none", bgcolor: "#3FA46E", "&:hover": { bgcolor: "#14513C" } }}>
          Imprimir
        </Button>
      </Stack>

      <Card sx={{ borderRadius: 0, mb: 3 }} className="no-print"><CardContent>
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
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Pabellón</InputLabel>
            <Select value={pavilion} label="Pabellón" onChange={(e) => setPavilion(e.target.value)}>
              <MenuItem value=""><em>Todos</em></MenuItem>
              {(pavilions as any[]).map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Autocomplete
            size="small"
            sx={{ minWidth: 220 }}
            options={artistOpts}
            value={artist}
            onChange={(_, v) => setArtist(v)}
            onInputChange={(_, v) => setArtistQ(v)}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            filterOptions={(x) => x}
            noOptionsText={artistQ.trim().length < 2 ? "Escribe el nombre del artista" : "Sin resultados"}
            renderInput={(params) => <TextField {...params} label="Artista" />}
          />
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
                  <img src={qr} alt={`QR ${a.title}`} width={150} height={150} />
                ) : (
                  <div style={{ width: 150, height: 150, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 11 }}>generando…</div>
                )}
                <div className="qr-title">{a.title || "Sin título"}</div>
                {artist && <div className="qr-artist">{artist}</div>}
                <div className="qr-price">{money(a.price, a.currency)}</div>
                {a.reproducible && Number(a.stock) > 0 && (
                  <div className="qr-artist">Edición de {a.stock} reproducciones</div>
                )}
                <div className="qr-id">Escanea para comprar en línea</div>
              </div>
            );
          })}
        </Box>
      )}

      <style>{`
        .qr-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 12px;
        }
        .qr-label {
          border: 1px solid #E2DFD6;
          border-radius: 10px;
          padding: 14px;
          text-align: center;
          background: #fff;
          break-inside: avoid;
        }
        .qr-label img { display: block; margin: 0 auto; }
        .qr-title { font-weight: 800; font-size: 13px; margin-top: 8px; color: #111; }
        .qr-artist { font-size: 11px; color: #666; margin-top: 2px; }
        .qr-price { font-size: 12px; font-weight: 700; color: #3FA46E; margin-top: 4px; }
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
