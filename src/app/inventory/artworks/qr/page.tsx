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
import { buildLabelsHtml, labelSize, PAPERS, type Paper } from "./labelsHtml";

/* QR para imprimir, en dos pestañas:
   - Artistas: un QR por artista (lleva a su página con todas sus obras).
   - Obras: un QR por pieza para las etiquetas, filtrando por pabellón/artista.
   Todo carga perezoso: las obras por páginas al hacer scroll y cada QR se
   genera solo cuando entra en pantalla. "Imprimir" carga y genera todo antes.
   El dominio y la corrección de QR guardados con dominio viejo van en Ajustes. */

const money = (n?: number, currency = "COP") => formatCOP(n, { code: true, currency });

const DEFAULT_SHOP =
  (process.env.NEXT_PUBLIC_SHOP_URL as string | undefined) || "https://feria-millon.immsai.com";

// Caché de QR (promesas) para no regenerar el mismo dos veces.
const qrCache = new Map<string, Promise<string>>();
const ensureQr = (text: string, width: number) => {
  const key = `${width}|${text}`;
  let p = qrCache.get(key);
  if (!p) {
    p = QRCode.toDataURL(text, { width, margin: 1, errorCorrectionLevel: "M" });
    qrCache.set(key, p);
  }
  return p;
};

/* QR vectorial para las etiquetas: nítido a cualquier tamaño en la imprenta y casi
   sin memoria. Con PNG de 600 px, 4.500 etiquetas se comían ~2,5 GB de RAM. */
const svgCache = new Map<string, Promise<string>>();
const ensureQrSvg = (text: string) => {
  let p = svgCache.get(text);
  if (!p) {
    p = QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then(
      (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    );
    svgCache.set(text, p);
  }
  return p;
};

/** Hojas por lote: la vista previa y cada PDF llevan 20 hojas (360 etiquetas en pliego). */
const SHEETS_PER_BATCH = 20;

/* QR que se genera solo cuando entra en pantalla (o de inmediato con `eager`). */
function LazyQr({ text, alt, size = 150, width = 320, eager = false }: { text: string; alt: string; size?: number; width?: number; eager?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [src, setSrc] = React.useState<string>();
  React.useEffect(() => {
    let on = true;
    const go = () => { ensureQr(text, width).then((s) => { if (on) setSrc(s); }).catch(() => {}); };
    if (eager || !ref.current || typeof IntersectionObserver === "undefined") { go(); return () => { on = false; }; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { go(); io.disconnect(); }
    }, { rootMargin: "600px" });
    io.observe(ref.current);
    return () => { on = false; io.disconnect(); };
  }, [text, width, eager]);
  return (
    <div ref={ref} style={{ width: size, height: size, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 11 }}>
      {src ? <img src={src} alt={alt} width={size} height={size} /> : "generando…"}
    </div>
  );
}

type TabKey = "artists" | "artworks" | "labels";

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
  const [printing, setPrinting] = React.useState(false);

  // Pabellones con sus artistas: de aquí salen los selectores y la pestaña Artistas.
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

  // Regenera por lotes de 10: una sola llamada con cientos de obras pasa el
  // timeout del proxy (60 s) y el panel veía un error aunque el servidor siguiera.
  const [regenProgress, setRegenProgress] = React.useState("");
  const regen = useMutation({
    mutationFn: async () => {
      const first = await regenerateArtworkQrs({ mismatchOnly: true, dryRun: true });
      const total = first.remaining ?? first.totalMatched;
      let updated = 0, failed = 0, remaining = total;
      // ponytail: tope de vueltas por si el servidor viejo no filtra por dominio
      for (let i = 0; i < 60 && remaining > 0; i++) {
        setRegenProgress(`${updated + failed} de ${total}…`);
        const r = await regenerateArtworkQrs({ mismatchOnly: true, limit: 10 });
        updated += r.updated; failed += r.failed;
        if (r.updated === 0) break; // nada avanzó: no insistir con las mismas
        remaining = r.remaining ?? remaining - r.updated;
      }
      setRegenProgress("");
      return { totalMatched: total, updated, failed };
    },
  });

  // Obras: solo en la pestaña "Obras", por páginas al hacer scroll.
  const { rows, isLoading, hasNextPage, loadMore, isFetchingNextPage } = useArtworksCursor({
    event: eventId,
    pavilion: pavilion || undefined,
    artist: artist || undefined,
    limit: tab === "labels" ? 60 : 30,
    includeHidden: 1,
    project: "tagId,dimensionsText",
    enabled: tab === "artworks" || tab === "labels",
  });

  // Centinela al final de la grilla: al verse, carga la siguiente página.
  const sentinel = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = sentinel.current;
    if (!el || tab === "artists" || !hasNextPage) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) loadMore();
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [tab, hasNextPage, isFetchingNextPage, loadMore]);

  const base = shopUrl.replace(/\/+$/, "");
  const urlFor = (id: string) => `${base}/obra/${id}`;
  const artistUrl = (id: string) => `${base}/artista/${id}`;
  const rowId = (a: any) => String(a.id || a._id || "");

  // Imprimir: carga todas las páginas, genera todos los QR y recién entonces imprime.
  React.useEffect(() => {
    if (!printing) return;
    if (tab !== "artists" && hasNextPage) { if (!isFetchingNextPage) loadMore(); return; }
    let on = true;
    const jobs = tab === "artists"
      ? artistOptions.map((a) => ensureQr(artistUrl(a.id), 480))
      : (rows as any[]).map((a) => ensureQr(urlFor(rowId(a)), 320));
    Promise.allSettled(jobs).then(() => {
      if (!on) return;
      setTimeout(() => { window.print(); setPrinting(false); }, 150);
    });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printing, tab, hasNextPage, isFetchingNextPage, rows, artistOptions, base]);

  const artistName = (a: any) =>
    a.artistInfo ? `${a.artistInfo.firstName ?? ""} ${a.artistInfo.lastName ?? ""}`.trim() : "";

  // Etiquetas de inventario: una por unidad (n / total), agrupadas por artista y
  // sin precio. ponytail: el total es el stock actual; si ya se vendieron copias, sale el restante.
  const labels = React.useMemo(() => {
    const sorted = [...(rows as any[])].sort(
      (a, b) => artistName(a).localeCompare(artistName(b), "es") || String(a.title ?? "").localeCompare(String(b.title ?? ""), "es")
    );
    return sorted.flatMap((a) => {
      const total = Math.max(1, Number(a.stock) || 0);
      return Array.from({ length: total }, (_, i) => ({ a, n: total - i, total }));
    });
  }, [rows]);
  const missingCode = (rows as any[]).filter((a) => !a.tagId).length;

  // Formato de la imprenta: pliego 48 × 33 cm horizontal, 18 etiquetas (6 × 3).
  const [lab, setLab] = React.useState<{ cols: number; rows: number; landscape: boolean; showQr: boolean; priceBox: boolean; paper: Paper }>(
    { cols: 6, rows: 3, landscape: true, showQr: true, priceBox: false, paper: "pliego" },
  );
  const size = labelSize(lab);
  // Las etiquetas necesitan todas las obras: se cargan solas, página por página.
  React.useEffect(() => {
    if (tab === "labels" && hasNextPage && !isFetchingNextPage) loadMore();
  }, [tab, hasNextPage, isFetchingNextPage, loadMore]);
  // Por lotes de 20 hojas: con todo junto (250+ hojas) el navegador se ahogaba.
  const perBatch = lab.cols * lab.rows * SHEETS_PER_BATCH;
  const batches = Math.max(1, Math.ceil(labels.length / perBatch));
  const [batch, setBatch] = React.useState(0);
  // -1 = todo en un solo PDF (para mandar un único archivo a la imprenta).
  const ALL = -1;
  const curBatch = batch === ALL ? ALL : Math.min(batch, batches - 1);
  React.useEffect(() => setBatch(0), [pavilion, artist]); // otro filtro: vuelve al lote 1
  const batchLabels = React.useMemo(
    () => (curBatch === ALL ? labels : labels.slice(curBatch * perBatch, (curBatch + 1) * perBatch)),
    [labels, curBatch, perBatch, ALL],
  );
  const batchIds = React.useMemo(() => [...new Set(batchLabels.map(({ a }) => rowId(a)))], [batchLabels]);

  const [qrs, setQrs] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (tab !== "labels") return;
    let on = true;
    // Solo los QR del lote que se ve (y queda en caché para cuando vuelvan a él).
    Promise.all(batchIds.map((id) => ensureQrSvg(urlFor(id)).catch(() => ""))).then((urls) => {
      if (on) setQrs((prev) => ({ ...prev, ...Object.fromEntries(batchIds.map((id, i) => [id, urls[i]])) }));
    });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, batchIds, base]);
  const labelsHtml = React.useMemo(
    () =>
      tab !== "labels"
        ? ""
        : buildLabelsHtml(
            batchLabels.map(({ a, n, total }) => ({
              artist: artistName(a) || "—",
              title: a.title || "Sin título",
              technique: a.techniqueInfo?.name,
              dimensions: a.dimensionsText,
              n,
              total,
              code: a.tagId,
              qr: qrs[rowId(a)],
            })),
            { ...lab, logoUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/logo.png` }
          ),
     
    [tab, batchLabels, lab, qrs]
  );
  const labelsFrame = React.useRef<HTMLIFrameElement>(null);
  // Listo para imprimir = todas las obras cargadas y, si lleva QR, todos los QR generados.
  // "in": un QR que falló queda en "" y no debe trabar el botón para siempre.
  const qrReady = batchIds.every((id) => id in qrs);
  const labelsReady = !hasNextPage && !isFetchingNextPage && qrReady;
  const printLabels = async () => {
    const w = labelsFrame.current?.contentWindow;
    if (!w || !labelsReady) return;
    // Fuentes, logo y QR ya pintados: si no, salen etiquetas sin QR o con otra letra.
    await w.document.fonts?.ready;
    await Promise.all(
      Array.from(w.document.images).map((img) =>
        img.complete ? null : new Promise((ok) => { img.onload = img.onerror = () => ok(null); }),
      ),
    );
    (w as Window & { fit?: () => void }).fit?.(); // reajusta la letra con fuentes e imágenes ya cargadas
    // Nombre del PDF: dice qué lote es, para mandarlos en orden a la imprenta.
    w.document.title = `etiquetas-${lab.paper === "pliego" ? "48x33cm" : "carta"}-${curBatch === ALL ? `todas-${Math.ceil(labels.length / (lab.cols * lab.rows))}-hojas` : `lote-${curBatch + 1}-de-${batches}`}`;
    w.focus();
    w.print();
  };

  const openArtist = (id: string) => { setArtist(id); setTab("artworks"); };

  const PavilionSelect = (
    <TextField select size="small" label="Pabellón" value={pavilion} onChange={(e) => { setPavilion(e.target.value); setArtist(""); }} sx={{ minWidth: 200 }}>
      <MenuItem value=""><em>Todos</em></MenuItem>
      {pavilions.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
    </TextField>
  );

  return (
    <Box>
      <Box className="no-print">
        <PageHeader
          crumb="Feria y obras"
          title="Etiquetas QR de obras"
          description={`${eventName}. Cada QR del artista lleva a su página con todas sus obras; cada QR de obra, a la ficha con el botón de compra.`}
          actions={[
            {
              label: printing || (tab === "labels" && !labelsReady) ? "Preparando…" : "Imprimir",
              kind: "pri",
              icon: printing || (tab === "labels" && !labelsReady) ? <CircularProgress size={14} /> : <Printer size={14} />,
              onClick: () => { if (tab === "labels") printLabels(); else if (!printing) setPrinting(true); },
              disabled: tab === "labels" && !labelsReady,
            },
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
                  {regen.isPending ? `Corrigiendo ${regenProgress || "…"}` : "Corregir QR guardados con dominio viejo"}
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
          <Tab value="artworks" label="Obras" />
          <Tab value="labels" label="Etiquetas (PDF)" />
        </Tabs>
      </Box>

      {/* ── Artistas: un QR por cada uno ── */}
      {tab === "artists" && (
        <>
          <Card sx={{ mb: 2 }} className="no-print"><CardContent sx={{ py: 1.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
              {PavilionSelect}
              <Typography variant="caption" color="text.secondary">Toca un artista para ver las etiquetas de sus obras.</Typography>
            </Stack>
          </CardContent></Card>
          {artistOptions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No hay artistas asignados {pavilion ? "a este pabellón" : "a pabellones"}.</Typography>
          ) : (
            <Box className="qr-grid">
              {artistOptions.map((ar) => (
                <button key={ar.id} type="button" className="qr-label qr-artist-card qr-click" onClick={() => openArtist(ar.id)}>
                  <LazyQr text={artistUrl(ar.id)} alt={`QR ${ar.name}`} width={480} eager={printing} />
                  <div className="qr-title">{ar.name}</div>
                  <div className="qr-artist">{ar.pavilion}</div>
                  <div className="qr-id">Escanea para ver todas sus obras</div>
                </button>
              ))}
            </Box>
          )}
        </>
      )}

      {/* ── Obras: etiquetas por pieza ── */}
      {tab === "artworks" && (
        <>
          <Card sx={{ mb: 2 }} className="no-print"><CardContent sx={{ py: 1.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
              {PavilionSelect}
              <TextField select size="small" label="Artista" value={artist} onChange={(e) => setArtist(e.target.value)} sx={{ minWidth: 260 }}
                helperText={!artistOptions.length ? "No hay artistas asignados a pabellones" : undefined}>
                <MenuItem value=""><em>Todos los artistas</em></MenuItem>
                {artistOptions.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
              </TextField>
              <Typography variant="caption" color="text.secondary">
                {isLoading ? "Cargando obras…" : `${rows.length} obras${hasNextPage ? " cargadas, hay más" : ""}`}
              </Typography>
            </Stack>
          </CardContent></Card>
          {isLoading ? (
            <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Box>
          ) : (
            <>
              <Box className="qr-grid">
                {(rows as any[]).map((a) => {
                  const id = rowId(a);
                  return (
                    <div key={id} className="qr-label">
                      <LazyQr text={urlFor(id)} alt={`QR ${a.title}`} eager={printing} />
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
              <div ref={sentinel} className="no-print" style={{ padding: 16, textAlign: "center" }}>
                {isFetchingNextPage ? <CircularProgress size={20} /> : hasNextPage ? (
                  <Button size="small" onClick={() => loadMore()} sx={{ textTransform: "none" }}>Cargar más</Button>
                ) : null}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Etiquetas de inventario para imprimir/PDF ── */}
      {tab === "labels" && (
        <>
          <Card sx={{ mb: 2 }} className="no-print"><CardContent sx={{ py: 1.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
              {PavilionSelect}
              <TextField select size="small" label="Artista" value={artist} onChange={(e) => setArtist(e.target.value)} sx={{ minWidth: 260 }}>
                <MenuItem value=""><em>Todos los artistas</em></MenuItem>
                {artistOptions.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
              </TextField>
              <Typography variant="caption" color="text.secondary">
                {isLoading ? "Cargando obras…" : `${rows.length} obras · ${labels.length} etiquetas${hasNextPage ? " (cargando el resto al imprimir)" : ""}`}
                {missingCode > 0 && ` · ${missingCode} sin código: corrígelas en Ajustes → Corregir QR`}
                <br />Imprimir → Destino «Guardar como PDF» · Márgenes: predeterminados · Escala: predeterminada (100 %). Ese PDF ya va en {PAPERS[lab.paper].label}.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
              <TextField
                select size="small" label="Papel" value={lab.paper} sx={{ width: 190 }}
                onChange={(e) => {
                  const paper = e.target.value as Paper;
                  // Pliego: el formato de la imprenta (6 × 3 = 18). Carta: el de antes (4 × 3).
                  setLab(paper === "pliego" ? { ...lab, paper, cols: 6, rows: 3, landscape: true } : { ...lab, paper, cols: 4, rows: 3, landscape: true });
                }}
              >
                {(Object.keys(PAPERS) as Paper[]).map((p) => <MenuItem key={p} value={p}>{PAPERS[p].label}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Por fila" value={lab.cols} onChange={(e) => setLab({ ...lab, cols: Number(e.target.value) })} sx={{ width: 100 }}>
                {[2, 3, 4, 5, 6].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Filas" value={lab.rows} onChange={(e) => setLab({ ...lab, rows: Number(e.target.value) })} sx={{ width: 100 }}>
                {[1, 2, 3, 4].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Hoja" value={lab.landscape ? "h" : "v"} onChange={(e) => setLab({ ...lab, landscape: e.target.value === "h" })} sx={{ width: 140 }}>
                <MenuItem value="h">Horizontal</MenuItem>
                <MenuItem value="v">Vertical</MenuItem>
              </TextField>
              {/* Un PDF por lote: imprime el 1, luego el 2… (cada uno abre rápido). */}
              <TextField select size="small" label="Qué imprimir" value={curBatch} onChange={(e) => setBatch(Number(e.target.value))} sx={{ minWidth: 260 }}>
                <MenuItem value={ALL}>Todo en un solo PDF ({Math.ceil(labels.length / (lab.cols * lab.rows))} hojas · tarda más)</MenuItem>
                {Array.from({ length: batches }, (_, i) => {
                  const per = lab.cols * lab.rows;
                  const from = i * SHEETS_PER_BATCH + 1;
                  const to = Math.min((i + 1) * SHEETS_PER_BATCH, Math.ceil(labels.length / per));
                  return <MenuItem key={i} value={i}>Lote {i + 1} de {batches} · hojas {from}–{to}</MenuItem>;
                })}
              </TextField>
              <Typography variant="caption" color="text.secondary">
                {lab.cols * lab.rows} por hoja · {Math.ceil(labels.length / (lab.cols * lab.rows))} hojas en {batches} lote{batches === 1 ? "" : "s"} · etiqueta de {(size.w / 10).toFixed(1)} × {(size.h / 10).toFixed(1)} cm
              </Typography>
            </Stack>
          </CardContent></Card>
          {isLoading ? (
            <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Box>
          ) : (
            <iframe
              ref={labelsFrame}
              title="Vista previa de etiquetas"
              srcDoc={labelsHtml}
              style={{ width: "100%", height: "75vh", border: 0, borderRadius: 8, background: "#8d8a86" }}
            />
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
