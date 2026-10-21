"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, Button, TextField, MenuItem, CircularProgress, Tabs, Tab, Collapse,
} from "@mui/material";
import { Printer, Settings2, Wand2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import QRCode from "qrcode";
import { useArtworksCursor } from "@/hooks/useArtworksCursor";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { listPavilions, type PavilionDoc } from "@services/pavilions.service";
import { regenerateArtworkQrs } from "@services/artworks.service";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatCOP } from "@/utils/money";

/* QR para imprimir, en tres pestañas:
   - Artistas: un QR por artista (lleva a su página con todas sus obras).
   - Un artista: su QR grande y, debajo, un QR por cada obra suya.
   - Obras: un QR por pieza para las etiquetas, filtrando por pabellón/artista.
   El dominio y la corrección de QR guardados con dominio viejo van en Ajustes. */

const money = (n?: number, currency = "COP") => formatCOP(n, { code: true, currency });

const DEFAULT_SHOP =
  (process.env.NEXT_PUBLIC_SHOP_URL as string | undefined) || "https://feria-millon.immsai.com";

const toDataUrl = (text: string, width = 320) =>
  QRCode.toDataURL(text, { width, margin: 1, errorCorrectionLevel: "M" });

type TabKey = "artists" | "artist" | "artworks";

type ArtistOpt = { id: string; name: string; pavilion: string };

export default function ArtworksQrPage() {
  const { eventId, eventName, isLoading, isError, refetch } = useActiveEvent();
  if (!eventId) return <ActiveEventGate isLoading={isLoading} isError={isError} onRetry={refetch} />;
  return <QrPage eventId={eventId} eventName={eventName} />;
}

function QrPage({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [tab, setTab] = React.useState<TabKey>("artists");
  const [shopUrl, setShopUrl] = React.useState<string>(DEFAULT_SHOP);
  const [pavilion, setPavilion] = React.useState("");
  const [artist, setArtist] = React.useState("");
  const [showSettings, setShowSettings] = React.useState(false);

  // Pabellones con sus artistas: de aquí salen los selectores.
  const { data: pavilionsData = [] } = useQuery({
    queryKey: ["pavilions", eventId, "with-artists"],
    queryFn: () => listPavilions(eventId, true),
    staleTime: 60_000,
  });
  const pavilions = pavilionsData as PavilionDoc[];
  const artistOptions = React.useMemo<ArtistOpt[]>(() => {
    const map = new Map<string, ArtistOpt>();
    for (const p of pavilions) {
      if (pavilion && String(p.id) !== pavilion) continue;
      for (const a of (p as any).artistInfo ?? []) {
        const id = String(a.id);
        if (!map.has(id)) map.set(id, { id, name: `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() || a.email, pavilion: p.name });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [pavilions, pavilion]);
  const selectedArtist = artistOptions.find((a) => a.id === artist) || null;

  const regen = useMutation({ mutationFn: () => regenerateArtworkQrs({ mismatchOnly: true }) });

  // Obras: en "Un artista" solo las suyas; en "Obras" según los filtros; en
  // "Artistas" todas (para contar cuántas tiene cada uno).
  const artworkArtist = tab === "artist" ? artist || undefined : tab === "artworks" ? artist || undefined : undefined;
  const { rows, isLoading, hasNextPage, loadMore, isFetchingNextPage } = useArtworksCursor({
    event: eventId,
    pavilion: pavilion || undefined,
    artist: artworkArtist,
    limit: 60,
    includeHidden: 1,
  });
  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) loadMore();
  }, [hasNextPage, isFetchingNextPage, loadMore]);

  const base = shopUrl.replace(/\/+$/, "");
  const urlFor = (id: string) => `${base}/obra/${id}`;
  const artistUrl = (id: string) => `${base}/artista/${id}`;

  const countByArtist = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of rows as any[]) {
      const id = a.artistInfo?._id ? String(a.artistInfo._id) : a.artist ? String(a.artist) : "";
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
    }
    return counts;
  }, [rows]);

  // QR por artista (data URLs)
  const [artistQr, setArtistQr] = React.useState<Record<string, string>>({});
  const artistsKey = artistOptions.map((a) => a.id).join(",");
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const ar of artistOptions) {
        try { out[ar.id] = await toDataUrl(artistUrl(ar.id), 480); } catch { /* skip */ }
      }
      if (!cancelled) setArtistQr(out);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistsKey, base]);

  // QR por obra (data URLs)
  const [qrById, setQrById] = React.useState<Record<string, string>>({});
  const [building, setBuilding] = React.useState(false);
  const rowsKey = React.useMemo(() => (rows as any[]).map((a) => a.id || a._id).filter(Boolean).join(","), [rows]);
  React.useEffect(() => {
    if (tab === "artists") return; // no hace falta
    let cancelled = false;
    (async () => {
      if (!rows.length) { setQrById({}); return; }
      setBuilding(true);
      const out: Record<string, string> = {};
      for (const a of rows as any[]) {
        const id = a.id || a._id;
        if (!id) continue;
        try { out[id] = await toDataUrl(urlFor(id)); } catch { /* skip */ }
      }
      if (!cancelled) { setQrById(out); setBuilding(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsKey, base, tab]);

  const artistName = (a: any) =>
    a.artistInfo ? `${a.artistInfo.firstName ?? ""} ${a.artistInfo.lastName ?? ""}`.trim() : "";

  const openArtist = (id: string) => { setArtist(id); setTab("artist"); };

  const PavilionSelect = (
    <TextField select size="small" label="Pabellón" value={pavilion} onChange={(e) => { setPavilion(e.target.value); setArtist(""); }} sx={{ minWidth: 200 }}>
      <MenuItem value=""><em>Todos</em></MenuItem>
      {pavilions.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
    </TextField>
  );
  const ArtistSelect = (allLabel: string) => (
    <TextField select size="small" label="Artista" value={artist} onChange={(e) => setArtist(e.target.value)} sx={{ minWidth: 260 }}
      helperText={!artistOptions.length ? "No hay artistas asignados a pabellones" : undefined}>
      <MenuItem value=""><em>{allLabel}</em></MenuItem>
      {artistOptions.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
    </TextField>
  );

  const Placeholder = ({ size = 150 }: { size?: number }) => (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 11 }}>generando…</div>
  );

  return (
    <Box>
      <Box className="no-print">
        <PageHeader
          crumb="Inventario"
          title="QR de artistas y obras"
          description={`${eventName}. Cada QR del artista lleva a su página con todas sus obras; cada QR de obra, a la ficha con el botón de compra.`}
          actions={[
            { label: "Imprimir", kind: "pri", icon: <Printer size={14} />, onClick: () => window.print() },
            { label: "Ajustes", kind: "sec", icon: <Settings2 size={14} />, onClick: () => setShowSettings((v) => !v) },
          ]}
        />

        <Collapse in={showSettings}>
          <Card sx={{ mb: 2 }}><CardContent>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "flex-start" }}>
              <TextField size="small" label="Dominio de la tienda" value={shopUrl} onChange={(e) => setShopUrl(e.target.value)} sx={{ flex: 1, minWidth: 240 }}
                helperText={`Artista: ${base}/artista/… · Obra: ${base}/obra/…`} />
              <Box>
                <Button variant="outlined" startIcon={regen.isPending ? <CircularProgress size={14} /> : <Wand2 size={16} />} disabled={regen.isPending} onClick={() => regen.mutate()} sx={{ textTransform: "none" }}>
                  Corregir QR guardados con dominio viejo
                </Button>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, maxWidth: 420 }}>
                  Los QR que se imprimen aquí se generan al momento con este dominio. Este botón arregla los que quedaron guardados en cada obra (los que ve el artista en su estudio).
                </Typography>
                {regen.isSuccess && (
                  <Typography variant="caption" sx={{ display: "block", color: regen.data.failed ? "warning.main" : "success.main" }}>
                    {regen.data.totalMatched} con dominio viejo, {regen.data.updated} corregidos{regen.data.failed ? `, ${regen.data.failed} fallaron` : ""}.
                  </Typography>
                )}
                {regen.isError && <Typography variant="caption" color="error" display="block">No se pudieron regenerar.</Typography>}
              </Box>
            </Stack>
          </CardContent></Card>
        </Collapse>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
          <Tab value="artists" label={`Artistas (${artistOptions.length})`} />
          <Tab value="artist" label="Un artista" />
          <Tab value="artworks" label="Obras" />
        </Tabs>
      </Box>

      {/* ── Artistas: un QR por cada uno ── */}
      {tab === "artists" && (
        <>
          <Card sx={{ mb: 2 }} className="no-print"><CardContent sx={{ py: 1.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
              {PavilionSelect}
              <Typography variant="caption" color="text.secondary">Toca un artista para verlo en grande con sus obras.</Typography>
            </Stack>
          </CardContent></Card>
          {artistOptions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No hay artistas asignados {pavilion ? "a este pabellón" : "a pabellones"}.</Typography>
          ) : (
            <Box className="qr-grid">
              {artistOptions.map((ar) => {
                const n = countByArtist.get(ar.id) || 0;
                return (
                  <button key={ar.id} type="button" className="qr-label qr-artist-card qr-click" onClick={() => openArtist(ar.id)}>
                    {artistQr[ar.id] ? <img src={artistQr[ar.id]} alt={`QR ${ar.name}`} width={150} height={150} /> : <Placeholder />}
                    <div className="qr-title">{ar.name}</div>
                    <div className="qr-artist">{ar.pavilion}</div>
                    <div className="qr-price">{isLoading ? "…" : `${n} ${n === 1 ? "obra" : "obras"}`}</div>
                    <div className="qr-id">Escanea para ver todas sus obras</div>
                  </button>
                );
              })}
            </Box>
          )}
        </>
      )}

      {/* ── Un artista: QR grande + sus obras ── */}
      {tab === "artist" && (
        <>
          <Card sx={{ mb: 2 }} className="no-print"><CardContent sx={{ py: 1.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              {PavilionSelect}
              {ArtistSelect("Elige un artista")}
            </Stack>
          </CardContent></Card>
          {!selectedArtist ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>Elige un artista para ver su QR y el de cada una de sus obras.</Typography>
          ) : (
            <>
              <Box className="qr-hero">
                {artistQr[selectedArtist.id] ? <img src={artistQr[selectedArtist.id]} alt={`QR ${selectedArtist.name}`} width={240} height={240} /> : <Placeholder size={240} />}
                <div className="qr-hero-text">
                  <div className="qr-id">Artista · {selectedArtist.pavilion}</div>
                  <div className="qr-hero-name">{selectedArtist.name}</div>
                  <div className="qr-artist">{isLoading ? "Cargando obras…" : `${rows.length} ${rows.length === 1 ? "obra" : "obras"} en la feria`}</div>
                  <div className="qr-price">Escanea para ver todas sus obras y comprar</div>
                  <div className="qr-url">{artistUrl(selectedArtist.id)}</div>
                </div>
              </Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }} className="no-print">
                Etiquetas de sus obras {building ? "· generando QR…" : ""}
              </Typography>
              {isLoading ? (
                <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Box>
              ) : (
                <Box className="qr-grid">
                  {(rows as any[]).map((a) => {
                    const id = a.id || a._id;
                    return (
                      <div key={id} className="qr-label">
                        {qrById[id] ? <img src={qrById[id]} alt={`QR ${a.title}`} width={150} height={150} /> : <Placeholder />}
                        <div className="qr-title">{a.title || "Sin título"}</div>
                        <div className="qr-price">{money(a.price, a.currency)}</div>
                        {a.reproducible && Number(a.stock) > 0 && <div className="qr-artist">Edición de {a.stock} reproducciones</div>}
                        <div className="qr-id">Escanea para comprar en línea</div>
                      </div>
                    );
                  })}
                  {rows.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ gridColumn: "1 / -1", p: 2 }}>Este artista todavía no tiene obras cargadas.</Typography>
                  )}
                </Box>
              )}
            </>
          )}
        </>
      )}

      {/* ── Obras: etiquetas por pieza ── */}
      {tab === "artworks" && (
        <>
          <Card sx={{ mb: 2 }} className="no-print"><CardContent sx={{ py: 1.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
              {PavilionSelect}
              {ArtistSelect("Todos los artistas")}
              <Typography variant="caption" color="text.secondary">
                {isLoading ? "Cargando obras…" : `${rows.length} obras`} {building ? "· generando QR…" : ""}
              </Typography>
            </Stack>
          </CardContent></Card>
          {isLoading ? (
            <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Box>
          ) : (
            <Box className="qr-grid">
              {(rows as any[]).map((a) => {
                const id = a.id || a._id;
                return (
                  <div key={id} className="qr-label">
                    {qrById[id] ? <img src={qrById[id]} alt={`QR ${a.title}`} width={150} height={150} /> : <Placeholder />}
                    <div className="qr-title">{a.title || "Sin título"}</div>
                    {artistName(a) && <div className="qr-artist">{artistName(a)}</div>}
                    <div className="qr-price">{money(a.price, a.currency)}</div>
                    {a.reproducible && Number(a.stock) > 0 && <div className="qr-artist">Edición de {a.stock} reproducciones</div>}
                    <div className="qr-id">Escanea para comprar en línea</div>
                  </div>
                );
              })}
              {rows.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ gridColumn: "1 / -1", p: 2 }}>No hay obras con estos filtros.</Typography>
              )}
            </Box>
          )}
        </>
      )}

      <style>{`
        .qr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
        .qr-label { border: 1px solid #E2DFD6; border-radius: 10px; padding: 14px; text-align: center; background: #fff; break-inside: avoid; color: #111; font: inherit; }
        .qr-click { cursor: pointer; transition: border-color .15s, transform .15s; }
        .qr-click:hover { border-color: #3FA46E; transform: translateY(-1px); }
        .qr-label img { display: block; margin: 0 auto; }
        .qr-artist-card { border-color: #3FA46E; }
        .qr-title { font-weight: 800; font-size: 13px; margin-top: 8px; color: #111; }
        .qr-artist { font-size: 11px; color: #666; margin-top: 2px; }
        .qr-price { font-size: 12px; font-weight: 700; color: #3FA46E; margin-top: 4px; }
        .qr-id { font-size: 9px; color: #999; margin-top: 4px; text-transform: uppercase; letter-spacing: .06em; }
        .qr-url { font-size: 10px; color: #999; margin-top: 8px; word-break: break-all; }
        .qr-hero { display: flex; flex-wrap: wrap; align-items: center; gap: 28px; border: 2px solid #3FA46E; border-radius: 12px; padding: 24px; background: #fff; margin-bottom: 24px; break-inside: avoid; color: #111; }
        .qr-hero-text { flex: 1; min-width: 220px; }
        .qr-hero-name { font-weight: 800; font-size: 26px; line-height: 1.1; margin: 4px 0 6px; }
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
