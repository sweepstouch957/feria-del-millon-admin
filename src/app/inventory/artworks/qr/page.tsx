"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, Button, TextField, MenuItem, CircularProgress,
} from "@mui/material";
import { Printer, UserRound, Wand2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import QRCode from "qrcode";
import { useArtworksCursor } from "@/hooks/useArtworksCursor";
import { ActiveEventGate, useActiveEvent } from "@hooks/events/useActiveEvent";
import { listPavilions, type PavilionDoc } from "@services/pavilions.service";
import { regenerateArtworkQrs } from "@services/artworks.service";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatCOP } from "@/utils/money";

/* QR para imprimir. Se elige el artista (o el pabellón) y sale su QR grande,
   que lleva a su página con todas sus obras, y debajo un QR por obra para la
   etiqueta de cada pieza. Sin artista elegido: un QR por cada artista. */

const money = (n?: number, currency = "COP") => formatCOP(n, { code: true, currency });

const DEFAULT_SHOP =
  (process.env.NEXT_PUBLIC_SHOP_URL as string | undefined) || "https://feria-millon.immsai.com";

const toDataUrl = (text: string, width = 320) =>
  QRCode.toDataURL(text, { width, margin: 1, errorCorrectionLevel: "M" });

export default function ArtworksQrPage() {
  const { eventId, eventName, isLoading, isError, refetch } = useActiveEvent();
  if (!eventId) return <ActiveEventGate isLoading={isLoading} isError={isError} onRetry={refetch} />;
  return <QrPage eventId={eventId} eventName={eventName} />;
}

function QrPage({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [shopUrl, setShopUrl] = React.useState<string>(DEFAULT_SHOP);
  const [pavilion, setPavilion] = React.useState("");
  const [artist, setArtist] = React.useState("");
  const [qrById, setQrById] = React.useState<Record<string, string>>({});
  const [artistQr, setArtistQr] = React.useState<Record<string, string>>({});
  const [building, setBuilding] = React.useState(false);

  // Pabellones con sus artistas: de aquí salen los dos selectores.
  const { data: pavilionsData = [] } = useQuery({
    queryKey: ["pavilions", eventId, "with-artists"],
    queryFn: () => listPavilions(eventId, true),
    staleTime: 60_000,
  });
  const pavilions = pavilionsData as PavilionDoc[];
  const artistOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; pavilion: string }>();
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

  // Los QR guardados en cada obra (meta.qrPublic) los genera el servidor; si
  // alguno salió con un dominio viejo, se regeneran apuntando a la tienda actual.
  const regen = useMutation({ mutationFn: () => regenerateArtworkQrs({ mismatchOnly: true }) });

  const { rows, isLoading, hasNextPage, loadMore, isFetchingNextPage } = useArtworksCursor({
    event: eventId,
    pavilion: pavilion || undefined,
    artist: artist || undefined,
    limit: 60,
    includeHidden: 1,
  });

  // Auto-cargar todas las páginas (para imprimir todo).
  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) loadMore();
  }, [hasNextPage, isFetchingNextPage, loadMore]);

  const base = shopUrl.replace(/\/+$/, "");
  const urlFor = (id: string) => `${base}/obra/${id}`;
  const artistUrl = (id: string) => `${base}/artista/${id}`;

  // Sin artista elegido: un QR por artista del listado (del pabellón, o de toda la feria).
  const artistsToShow = React.useMemo(() => {
    if (selectedArtist) return [selectedArtist];
    const counts = new Map<string, number>();
    for (const a of rows as any[]) {
      const id = a.artistInfo?._id ? String(a.artistInfo._id) : a.artist ? String(a.artist) : "";
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
    }
    return artistOptions.map((a) => ({ ...a, count: counts.get(a.id) || 0 }));
  }, [selectedArtist, artistOptions, rows]);

  const artistsKey = artistsToShow.map((a) => a.id).join(",");
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const ar of artistsToShow) {
        try { out[ar.id] = await toDataUrl(artistUrl(ar.id), 480); } catch { /* skip */ }
      }
      if (!cancelled) setArtistQr(out);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistsKey, base]);

  const rowsKey = React.useMemo(
    () => (rows as any[]).map((a) => a.id || a._id).filter(Boolean).join(","),
    [rows]
  );
  React.useEffect(() => {
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
  }, [rowsKey, base]);

  const artistName = (a: any) =>
    a.artistInfo ? `${a.artistInfo.firstName ?? ""} ${a.artistInfo.lastName ?? ""}`.trim() : "";

  return (
    <Box>
      <Box className="no-print">
        <PageHeader
          crumb="Inventario"
          title="QR de artistas y obras"
          description={`${eventName}. Elige un artista: sale su QR (lleva a todas sus obras) y uno por obra para las etiquetas.`}
          actions={[
            { label: "Imprimir", kind: "pri", icon: <Printer size={14} />, onClick: () => window.print() },
            {
              label: regen.isPending ? "Regenerando…" : "Corregir QR con dominio viejo",
              kind: "sec",
              icon: <Wand2 size={14} />,
              disabled: regen.isPending,
              onClick: () => regen.mutate(),
            },
          ]}
        />
      </Box>

      <Card sx={{ mb: 3 }} className="no-print"><CardContent>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <TextField select size="small" label="Pabellón" value={pavilion} onChange={(e) => { setPavilion(e.target.value); setArtist(""); }} sx={{ minWidth: 200 }}>
            <MenuItem value=""><em>Todos</em></MenuItem>
            {pavilions.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Artista" value={artist} onChange={(e) => setArtist(e.target.value)} sx={{ minWidth: 260 }}
            helperText={!artistOptions.length ? "No hay artistas asignados a pabellones" : undefined}>
            <MenuItem value=""><em>Todos los artistas</em></MenuItem>
            {artistOptions.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Dominio de la tienda" value={shopUrl} onChange={(e) => setShopUrl(e.target.value)} sx={{ flex: 1, minWidth: 240 }}
            helperText={`Artista: ${base}/artista/… · Obra: ${base}/obra/…`} />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          {isLoading ? "Cargando obras…" : `${rows.length} obras · ${artistOptions.length} artistas`} {building ? "· generando QR…" : ""}
        </Typography>
        {regen.isSuccess && (
          <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: regen.data.failed ? "warning.main" : "success.main" }}>
            QR guardados: {regen.data.totalMatched} con dominio viejo, {regen.data.updated} corregidos
            {regen.data.failed ? `, ${regen.data.failed} fallaron` : ""}. Ahora apuntan a {regen.data.target || base}/obra/…
          </Typography>
        )}
        {regen.isError && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>No se pudieron regenerar los QR guardados.</Typography>
        )}
      </CardContent></Card>

      {/* Artista elegido: su QR grande, con sus obras debajo */}
      {selectedArtist ? (
        <Box className="qr-hero">
          {artistQr[selectedArtist.id] ? (
            <img src={artistQr[selectedArtist.id]} alt={`QR ${selectedArtist.name}`} width={240} height={240} />
          ) : (
            <div style={{ width: 240, height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 11 }}>generando…</div>
          )}
          <div className="qr-hero-text">
            <div className="qr-id">Artista · {selectedArtist.pavilion}</div>
            <div className="qr-hero-name">{selectedArtist.name}</div>
            <div className="qr-artist">{isLoading ? "Cargando obras…" : `${rows.length} ${rows.length === 1 ? "obra" : "obras"} en la feria`}</div>
            <div className="qr-price">Escanea para ver todas sus obras y comprar</div>
            <div className="qr-url">{artistUrl(selectedArtist.id)}</div>
          </div>
        </Box>
      ) : (
        !isLoading && artistsToShow.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }} className="no-print">
              <UserRound size={16} />
              <Typography variant="subtitle1" fontWeight={500}>Un QR por artista</Typography>
              <Typography variant="caption" color="text.secondary">elige uno arriba para verlo grande con sus obras</Typography>
            </Stack>
            <Box className="qr-grid">
              {artistsToShow.map((ar: any) => (
                <button key={ar.id} type="button" className="qr-label qr-artist-card qr-click" onClick={() => setArtist(ar.id)}>
                  {artistQr[ar.id] ? (
                    <img src={artistQr[ar.id]} alt={`QR ${ar.name}`} width={150} height={150} />
                  ) : (
                    <div style={{ width: 150, height: 150, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 11 }}>generando…</div>
                  )}
                  <div className="qr-title">{ar.name}</div>
                  <div className="qr-artist">{ar.pavilion}</div>
                  <div className="qr-price">{ar.count} {ar.count === 1 ? "obra" : "obras"}</div>
                  <div className="qr-id">Escanea para ver todas sus obras</div>
                </button>
              ))}
            </Box>
          </Box>
        )
      )}

      {/* Obras */}
      {(selectedArtist || pavilion) && (
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }} className="no-print">
          <Typography variant="subtitle1" fontWeight={500}>QR por obra</Typography>
          <Typography variant="caption" color="text.secondary">para la etiqueta de cada pieza</Typography>
        </Stack>
      )}
      {isLoading ? (
        <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Box>
      ) : (selectedArtist || pavilion) ? (
        <Box className="qr-grid">
          {(rows as any[]).map((a) => {
            const id = a.id || a._id;
            const qr = qrById[id];
            return (
              <div key={id} className="qr-label">
                {qr ? (
                  <img src={qr} alt={`QR ${a.title}`} width={150} height={150} />
                ) : (
                  <div style={{ width: 150, height: 150, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 11 }}>generando…</div>
                )}
                <div className="qr-title">{a.title || "Sin título"}</div>
                {!selectedArtist && artistName(a) && <div className="qr-artist">{artistName(a)}</div>}
                <div className="qr-price">{money(a.price, a.currency)}</div>
                {a.reproducible && Number(a.stock) > 0 && (
                  <div className="qr-artist">Edición de {a.stock} reproducciones</div>
                )}
                <div className="qr-id">Escanea para comprar en línea</div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ gridColumn: "1 / -1", p: 2 }}>
              Este artista todavía no tiene obras cargadas.
            </Typography>
          )}
        </Box>
      ) : null}

      <style>{`
        .qr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
        .qr-label { border: 1px solid #E2DFD6; border-radius: 10px; padding: 14px; text-align: center; background: #fff; break-inside: avoid; color: #111; font: inherit; }
        .qr-click { cursor: pointer; transition: border-color .15s; }
        .qr-click:hover { border-color: #3FA46E; }
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
