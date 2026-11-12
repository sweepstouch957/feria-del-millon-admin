"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, TextField, MenuItem, Tabs, Tab,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, CircularProgress, LinearProgress,
  Avatar, Chip, Link,
} from "@mui/material";
import { FileSpreadsheet, Mail, Phone, RefreshCw } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import ReportTabs from "@/components/ui/ReportTabs";
import { useQuery } from "@tanstack/react-query";
import { getSalesReport, type SalesBucket, type SalesLine } from "@services/orders.service";
import { useEvents } from "@/hooks/useEvents";
import { usePavilions } from "@/hooks/usePavilions";
import { useTechniques } from "@/hooks/useTechniques";
import { formatCOP } from "@/utils/money";
import { toCsv, downloadCsv, stamp } from "@/utils/csv";
import LockedNotice from "@/components/ui/LockedNotice";
import { SALES_DETAIL_ENABLED } from "@/utils/exportsLock";

const money = (n?: number) => formatCOP(n, { code: true });

const VIEWS = [
  { key: "byDay", label: "Por día", col: "Día" },
  { key: "bySeller", label: "Por cajera", col: "Cajera" },
  { key: "byMethod", label: "Por tipo de pago", col: "Tipo de pago" },
  { key: "byPavilion", label: "Por pabellón", col: "Pabellón" },
  { key: "byArtist", label: "Por artista", col: "Artista" },
  { key: "byTechnique", label: "Por técnica", col: "Técnica" },
] as const;

export default function Page() {
  return SALES_DETAIL_ENABLED ? <SalesReportPage /> : <LockedNotice title="Reporte de ventas" />;
}

function SalesReportPage() {
  const [f, setF] = React.useState({ event: "", from: "", to: "", pavilion: "", technique: "", artist: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value, ...(k === "event" ? { pavilion: "" } : {}) }));
  const [view, setView] = React.useState<(typeof VIEWS)[number]["key"]>("byDay");

  const { data: events = [] } = useEvents();
  const { data: pavilions = [] } = usePavilions(f.event || undefined);
  const { data: techniques = [] } = useTechniques();

  const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["reports", "sales", params],
    queryFn: () => getSalesReport(params),
    staleTime: 30_000,
  });

  // Lista de artistas sale del informe sin filtro de artista, para no perder opciones al elegir uno.
  const { data: base } = useQuery({
    queryKey: ["reports", "sales", { ...params, artist: undefined }],
    queryFn: () => getSalesReport({ ...params, artist: undefined }),
    staleTime: 30_000,
    enabled: !!f.artist,
  });
  const artists = (f.artist ? base?.byArtist : data?.byArtist) || [];

  const rows: SalesBucket[] = data?.[view] || [];
  const current = VIEWS.find((v) => v.key === view)!;

  const exportSummary = () =>
    downloadCsv(`ventas_${view}_${stamp()}.csv`, toCsv(rows, [
      { header: current.col, value: (r) => r.label },
      { header: "Unidades", value: (r) => r.units },
      { header: "Caja (COP)", value: (r) => r.caja },
      { header: "En línea (COP)", value: (r) => r.online },
      { header: "Total (COP)", value: (r) => r.amount },
    ]));
  const exportLines = () =>
    downloadCsv(`ventas_detalle_${stamp()}.csv`, toCsv(data?.lines || [], [
      { header: "Día", value: (l) => l.day },
      { header: "Pedido", value: (l) => l.orderId, text: true },
      { header: "Obra", value: (l) => l.artwork },
      { header: "Artista", value: (l) => l.artist },
      { header: "Técnica", value: (l) => l.technique },
      { header: "Pabellón", value: (l) => l.pavilion },
      { header: "Cantidad", value: (l) => l.qty },
      { header: "Valor (COP)", value: (l) => l.amount },
      { header: "Canal", value: (l) => l.channel },
      { header: "Tipo de pago", value: (l) => l.methodLabel || l.method },
      { header: "Comprador", value: (l) => l.buyer },
      { header: "Email", value: (l) => l.buyerEmail },
      { header: "Teléfono", value: (l) => l.buyerPhone, text: true },
      { header: "Cajera", value: (l) => l.cashier || "En línea" },
    ]));

  return (
    <Box>
      <PageHeader
        crumb="Reportes"
        title="Ventas de obras"
        description="Obras pagadas, por día de pago (hora Colombia)."
        actions={[
          {
            label: "Exportar resumen",
            kind: "sec",
            icon: <FileSpreadsheet size={14} />,
            disabled: !rows.length,
            onClick: exportSummary,
          },
          {
            label: "Exportar detalle",
            kind: "sec",
            icon: <FileSpreadsheet size={14} />,
            disabled: !data?.lines?.length,
            onClick: exportLines,
          },
          {
            label: "Actualizar",
            kind: "sec",
            icon: <RefreshCw size={14} />,
            disabled: isFetching,
            onClick: () => refetch(),
          },
        ]}
      />
      <ReportTabs />

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={3} useFlexGap flexWrap="wrap">
        <TextField size="small" select label="Feria" value={f.event} onChange={set("event")} sx={{ minWidth: 180 }}>
          <MenuItem value="">Todas</MenuItem>
          {events.map((e: any) => <MenuItem key={e.id || e._id} value={e.id || e._id}>{e.name}</MenuItem>)}
        </TextField>
        <TextField size="small" type="date" label="Desde" value={f.from} onChange={set("from")} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="Hasta" value={f.to} onChange={set("to")} InputLabelProps={{ shrink: true }} />
        <TextField size="small" select label="Pabellón" value={f.pavilion} onChange={set("pavilion")} sx={{ minWidth: 160 }}>
          <MenuItem value="">Todos</MenuItem>
          {pavilions.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Técnica" value={f.technique} onChange={set("technique")} sx={{ minWidth: 160 }}>
          <MenuItem value="">Todas</MenuItem>
          {techniques.map((t: any) => <MenuItem key={t.id || t._id} value={t.id || t._id}>{t.name}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Artista" value={f.artist} onChange={set("artist")} sx={{ minWidth: 180 }}>
          <MenuItem value="">Todos</MenuItem>
          {artists.map((a) => <MenuItem key={a.key} value={a.key}>{a.label}</MenuItem>)}
        </TextField>
      </Stack>

      <KpiStrip
        loading={isLoading}
        items={[
          { label: "Total vendido", value: money(data?.total), accent: true },
          { label: "Obras vendidas", value: data?.units ?? 0 },
          { label: "Pedidos", value: data?.orders ?? 0 },
          { label: "En caja", value: money(data?.byDay.reduce((a, r) => a + r.caja, 0)) },
          { label: "En línea", value: money(data?.byDay.reduce((a, r) => a + r.online, 0)) },
        ]}
      />

      <Card>
        {isFetching && <LinearProgress />}
        <Tabs value={view} onChange={(_, v) => setView(v)} variant="scrollable" sx={{ px: 2.5 }}>
          {VIEWS.map((v) => <Tab key={v.key} value={v.key} label={v.label} />)}
        </Tabs>
        <CardContent>
          {isLoading ? (
            <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{current.col}</TableCell>
                    <TableCell align="right">Unidades</TableCell>
                    <TableCell align="right">Caja</TableCell>
                    <TableCell align="right">En línea</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ color: "text.secondary", py: 3 }}>Sin ventas con estos filtros.</TableCell></TableRow>
                  ) : rows.map((r) => (
                    <TableRow key={r.key} hover>
                      <TableCell>{r.label}</TableCell>
                      <TableCell align="right">{r.units}</TableCell>
                      <TableCell align="right">{money(r.caja)}</TableCell>
                      <TableCell align="right">{money(r.online)}</TableCell>
                      <TableCell align="right"><b>{money(r.amount)}</b></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {f.artist && !!data?.lines?.length && (
        <ArtistBuyers artist={artists.find((a) => a.key === f.artist)?.label || "este artista"} lines={data.lines} />
      )}

      {/* Venta por venta: quién la cobró y cómo pagaron. */}
      {!!data?.lines?.length && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 0.5 }}>Detalle de ventas</Typography>
            {!f.artist && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Elige un artista en el filtro de arriba para ver sus compradores.
              </Typography>
            )}
            <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 560, mt: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Día</TableCell>
                    <TableCell>Obra</TableCell>
                    <TableCell>Comprador</TableCell>
                    <TableCell>Pago</TableCell>
                    <TableCell align="right">Valor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.lines.slice(0, 300).map((l, i) => (
                    <TableRow key={`${l.orderId}-${i}`} hover sx={{ "& td": { py: 1.25, verticalAlign: "top" } }}>
                      <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>{l.day}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{l.artwork}</Typography>
                        <Typography variant="caption" color="text.secondary">{l.artist}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{l.buyer || "—"}</Typography>
                        <Contact email={l.buyerEmail} phone={l.buyerPhone} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{l.methodLabel || l.method}</Typography>
                        <Typography variant="caption" color="text.secondary">{l.cashier || "En línea"}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>{money(l.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {data.lines.length > 300 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Se muestran 300 de {data.lines.length}. Con Exportar detalle las descargas todas.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

const waLink = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d.length === 10 ? `57${d}` : d}`;
};

function Contact({ email, phone }: { email?: string; phone?: string }) {
  return (
    <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.25 }}>
      {email && (
        <Link href={`mailto:${email}`} underline="hover" variant="caption" color="text.secondary"
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, wordBreak: "break-all" }}>
          <Mail size={12} />{email}
        </Link>
      )}
      {phone && (
        <Link href={waLink(phone)} target="_blank" rel="noopener" underline="hover" variant="caption" color="text.secondary"
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, whiteSpace: "nowrap" }}>
          <Phone size={12} />{phone}
        </Link>
      )}
    </Stack>
  );
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

/** Compradores del artista elegido: una tarjeta por persona (agrupa por correo). */
function ArtistBuyers({ artist, lines }: { artist: string; lines: SalesLine[] }) {
  const buyers = React.useMemo(() => {
    const map = new Map<string, { name: string; email: string; phone: string; works: string[]; total: number }>();
    for (const l of lines) {
      const key = (l.buyerEmail || l.buyer || l.orderId).toLowerCase();
      const b = map.get(key) ?? { name: l.buyer, email: l.buyerEmail, phone: l.buyerPhone, works: [], total: 0 };
      b.works.push(l.qty > 1 ? `${l.artwork} ×${l.qty}` : l.artwork);
      b.total += l.amount;
      map.set(key, b);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [lines]);

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6">Compradores de {artist}</Typography>
          <Typography variant="body2" color="text.secondary">
            {buyers.length} {buyers.length === 1 ? "persona" : "personas"}
          </Typography>
        </Stack>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {buyers.map((b) => (
            <Box key={b.email || b.name} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2, display: "grid", gap: 1.25, alignContent: "start" }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: "primary.main", color: "primary.contrastText", width: 40, height: 40, fontSize: 15, fontWeight: 600 }}>
                  {initials(b.name)}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography fontWeight={600} noWrap>{b.name || "Sin nombre"}</Typography>
                  <Typography variant="body2" color="text.secondary">{money(b.total)}</Typography>
                </Box>
              </Stack>
              <Contact email={b.email} phone={b.phone} />
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                {b.works.map((w, i) => <Chip key={i} label={w} size="small" variant="outlined" />)}
              </Stack>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
