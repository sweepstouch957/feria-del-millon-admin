"use client";

import * as React from "react";
import {
  Alert, Avatar, Box, Button, Chip, Divider, Drawer, IconButton, LinearProgress, Skeleton, Stack, Tab, Tabs, Typography,
} from "@mui/material";
import { AlertTriangle, ImageOff, Images, Mail, MessageCircle, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import StatusPill, { type PillTone } from "@/components/ui/StatusPill";
import { formatCOP } from "@/utils/money";
import { eyebrow } from "@/app/theme";
import { getInventoryStatusDetail, type InventoryStatusRow } from "@services/applications.service";
import ArtworkViewer from "./ArtworkViewer";

/* La ficha de un artista en "Estado de carga". Arriba lo que importa de un
   vistazo (estado, totales, qué falta); abajo tres pestañas: sus obras como
   galería (clic = visor tipo tienda), el proyecto, y contacto/envío con un
   mensaje ya escrito con lo que le falta. */

const STATE: Record<InventoryStatusRow["state"], { label: string; tone: PillTone }> = {
  draft: { label: "Borrador", tone: "warn" },
  ready: { label: "Listo sin enviar", tone: "warn" },
  empty: { label: "Sin obras", tone: "mid" },
  sent: { label: "Enviado", tone: "ok" },
};
const APP_STATUS: Record<string, string> = {
  accepted: "Aceptada", rejected: "Rechazada", draft: "Borrador", submitted: "Enviada",
  under_review: "En revisión", stand_by: "Stand by", revision_requested: "Corrección pedida", pending_payment: "Sin pagar",
};

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }) : "—";
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

const Fact = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <Stack direction="row" gap={1.5} sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
    <Typography variant="body2" color="text.secondary" sx={{ width: 140, flexShrink: 0 }}>{k}</Typography>
    <Typography variant="body2" component="div" sx={{ minWidth: 0, wordBreak: "break-word" }}>{v}</Typography>
  </Stack>
);

const Stat = ({ label, value, warn }: { label: string; value: React.ReactNode; warn?: boolean }) => (
  <Box sx={{ p: 1.5, border: "1px solid", borderColor: warn ? "warning.main" : "divider", borderRadius: 1, minWidth: 0 }}>
    <Typography sx={{ ...eyebrow, fontSize: 9.5, color: warn ? "warning.main" : "text.secondary" }} noWrap>{label}</Typography>
    <Typography sx={{ fontSize: 20, mt: 0.25, fontVariantNumeric: "tabular-nums" }} noWrap>{value}</Typography>
  </Box>
);

export default function ArtistLoadDrawer({
  eventId,
  row,
  onClose,
}: {
  eventId: string;
  row: InventoryStatusRow | null;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["inventory-status-detail", eventId, row?.artistId],
    queryFn: () => getInventoryStatusDetail(eventId, row!.artistId),
    enabled: !!row,
  });

  const [tab, setTab] = React.useState(0);
  const [onlyIssues, setOnlyIssues] = React.useState(false);
  const [viewer, setViewer] = React.useState<number | null>(null);
  React.useEffect(() => { setTab(0); setOnlyIssues(false); setViewer(null); }, [row?.artistId]);

  const artworks = data?.artworks ?? [];
  const shown = onlyIssues ? artworks.filter((a) => a.issues.length) : artworks;

  // Mensaje listo con lo que le falta, para no redactarlo a mano cada vez.
  const reminder = React.useMemo(() => {
    if (!data) return "";
    const first = data.artist.name.split(/\s+/)[0];
    const pending: string[] = [];
    if (!data.artworks.length) pending.push("cargar tus obras");
    if (!data.application?.projectTitle?.trim()) pending.push("ponerle título a tu proyecto");
    if (!data.application?.projectReview?.trim()) pending.push("escribir la descripción del proyecto");
    const series = data.artworks.filter((a) => a.issues.includes("Serie con 1 copia")).length;
    if (series) pending.push(`revisar el número de copias de ${series} obra(s) marcadas como reproducción`);
    const noDims = data.artworks.filter((a) => a.issues.includes("Sin medidas")).length;
    if (noDims) pending.push(`agregar las medidas de ${noDims} obra(s)`);
    if (!data.application?.inventorySentAt) pending.push('darle "Enviar" a tu inventario cuando esté listo');
    return pending.length
      ? `Hola ${first}, te escribimos de la Feria del Millón. Para terminar tu carga en la plataforma te falta: ${pending.join("; ")}. Cualquier duda nos escribes. ¡Gracias!`
      : "";
  }, [data]);

  const phoneDigits = (data?.artist.phone || "").replace(/\D/g, "");
  const waPhone = phoneDigits.length === 10 && phoneDigits.startsWith("3") ? `57${phoneDigits}` : phoneDigits;

  return (
    <>
      <Drawer anchor="right" open={!!row} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", md: 780 } } }}>
        {row && (
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Cabecera */}
            <Box sx={{ p: 2.5, pb: 2 }}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <Avatar sx={{ width: 46, height: 46, bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 600 }}>
                  {initials(row.name)}
                </Avatar>
                <Box flex={1} minWidth={0}>
                  <Typography sx={{ fontSize: 21, lineHeight: 1.2 }} noWrap>{row.name}</Typography>
                  <Stack direction="row" gap={1} alignItems="center" mt={0.5}>
                    <StatusPill label={STATE[row.state].label} tone={STATE[row.state].tone} />
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {row.pavilions.join(" / ") || "Sin pabellón"}
                    </Typography>
                  </Stack>
                </Box>
                <IconButton onClick={onClose}><X size={20} /></IconButton>
              </Stack>

              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 1, mt: 2 }}>
                <Stat label="Obras" value={data ? data.totals.artworks : "…"} />
                <Stat label="Copias" value={data ? data.totals.copies : "…"} />
                <Stat label="Valor" value={data ? formatCOP(data.totals.value) : "…"} />
                <Stat label="Por revisar" value={data ? data.totals.withIssues : "…"} warn={!!data?.totals.withIssues} />
              </Box>

              {row.issues.length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={0.75} mt={1.5} alignItems="center">
                  <AlertTriangle size={14} color="currentColor" style={{ opacity: 0.7 }} />
                  {row.issues.map((i) => <Chip key={i} size="small" color="warning" variant="outlined" label={i} />)}
                </Stack>
              )}
            </Box>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 1.5, borderBottom: "1px solid", borderColor: "divider", minHeight: 42 }}>
              <Tab label={`Obras${data ? ` (${artworks.length})` : ""}`} sx={{ textTransform: "none", minHeight: 42 }} />
              <Tab label="Proyecto" sx={{ textTransform: "none", minHeight: 42 }} />
              <Tab label="Contacto y envío" sx={{ textTransform: "none", minHeight: 42 }} />
            </Tabs>
            {isLoading && <LinearProgress />}

            <Box sx={{ p: 2.5, overflowY: "auto", flex: 1 }}>
              {isError && <Alert severity="error">No se pudo cargar la ficha.</Alert>}

              {/* ── Obras: galería ── */}
              {tab === 0 && (
                <>
                  {data && artworks.some((a) => a.issues.length) && (
                    <Stack direction="row" gap={1} mb={2}>
                      <Chip label={`Todas (${artworks.length})`} color={!onlyIssues ? "secondary" : "default"} variant={!onlyIssues ? "filled" : "outlined"} onClick={() => setOnlyIssues(false)} />
                      <Chip label={`Por revisar (${data.totals.withIssues})`} color={onlyIssues ? "warning" : "default"} variant={onlyIssues ? "filled" : "outlined"} onClick={() => setOnlyIssues(true)} />
                    </Stack>
                  )}
                  {data && !artworks.length && (
                    <Stack alignItems="center" gap={1} sx={{ py: 6, color: "text.secondary" }}>
                      <Images size={28} />
                      <Typography variant="body2">Todavía no ha cargado obras.</Typography>
                    </Stack>
                  )}
                  <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))" }}>
                    {isLoading && Array.from({ length: 6 }, (_, i) => (
                      <Box key={i}><Skeleton variant="rectangular" sx={{ aspectRatio: "1", height: "auto" }} /><Skeleton width="70%" /><Skeleton width="40%" /></Box>
                    ))}
                    {shown.map((a) => (
                      <Box
                        key={a.id}
                        onClick={() => setViewer(artworks.indexOf(a))}
                        sx={{
                          cursor: "pointer", borderRadius: 1.5, overflow: "hidden", border: "1px solid", borderColor: "divider",
                          bgcolor: "background.paper", transition: "transform .18s, box-shadow .18s, border-color .18s",
                          "&:hover": { transform: "translateY(-3px)", boxShadow: 6, borderColor: "primary.main" },
                          "&:hover img": { transform: "scale(1.06)" },
                        }}
                      >
                        <Box sx={{ position: "relative", aspectRatio: "1", overflow: "hidden", bgcolor: "action.hover" }}>
                          {a.image ? (
                            <Box component="img" src={a.image} alt={a.title} loading="lazy"
                              sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform .35s ease" }} />
                          ) : (
                            <Stack alignItems="center" justifyContent="center" sx={{ height: "100%", color: "warning.main" }}>
                              <ImageOff size={22} />
                            </Stack>
                          )}
                          {a.issues.length > 0 && (
                            <Chip size="small" color="warning" icon={<AlertTriangle size={12} />} label={a.issues.length}
                              sx={{ position: "absolute", top: 8, left: 8, height: 22, fontWeight: 700 }} />
                          )}
                          {(a.gallery?.length ?? 0) > 1 && (
                            <Chip size="small" icon={<Images size={12} />} label={a.gallery.length}
                              sx={{ position: "absolute", top: 8, right: 8, height: 22, bgcolor: "rgba(11,11,10,.65)", color: "#fff", "& svg": { color: "#fff" } }} />
                          )}
                          <Box sx={{ position: "absolute", left: 8, bottom: 8, px: 1, py: 0.25, borderRadius: 1, bgcolor: "rgba(11,11,10,.65)", color: "#fff", fontSize: 11 }}>
                            {a.reproducible ? `Serie · ${a.stock}` : a.stock === 1 ? "Única" : `${a.stock} u.`}
                          </Box>
                        </Box>
                        <Box sx={{ p: 1.25 }}>
                          <Typography fontSize={13.5} fontWeight={500} sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.3, minHeight: "2.6em" }}>
                            {a.title}
                          </Typography>
                          <Typography fontSize={14.5} fontWeight={600} mt={0.5} sx={{ fontVariantNumeric: "tabular-nums" }}>
                            {a.price ? formatCOP(a.price) : <Box component="span" sx={{ color: "warning.main", fontSize: 12 }}>Sin precio</Box>}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {[a.technique, a.dimensions || "sin medidas"].filter(Boolean).join(" · ")}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                  {data && artworks.length > 0 && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                      Clic en una obra para verla en grande, con todas sus fotos y su ficha.
                    </Typography>
                  )}
                </>
              )}

              {/* ── Proyecto ── */}
              {tab === 1 && data && (
                <Box sx={{ maxWidth: 620 }}>
                  <Typography sx={{ ...eyebrow, color: "text.secondary" }}>Título</Typography>
                  <Typography sx={{ fontSize: 24, lineHeight: 1.25, mt: 0.5 }} color={data.application?.projectTitle ? "text.primary" : "warning.main"}>
                    {data.application?.projectTitle || "Sin título"}
                  </Typography>
                  <Typography sx={{ ...eyebrow, color: "text.secondary", mt: 3 }}>Descripción</Typography>
                  {data.application?.projectReview ? (
                    <>
                      <Typography sx={{ mt: 1, whiteSpace: "pre-line", lineHeight: 1.75, fontSize: 15 }}>
                        {data.application.projectReview}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                        {words(data.application.projectReview)} palabras
                      </Typography>
                    </>
                  ) : (
                    <Typography color="warning.main" mt={1}>Sin descripción</Typography>
                  )}
                </Box>
              )}

              {/* ── Contacto y envío ── */}
              {tab === 2 && data && (
                <Box sx={{ maxWidth: 620 }}>
                  {reminder && (
                    <Box sx={{ p: 2, mb: 3, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                      <Typography fontWeight={600} fontSize={14}>Recordarle lo que le falta</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: "italic", lineHeight: 1.6 }}>“{reminder}”</Typography>
                      <Stack direction="row" gap={1} mt={1.5} flexWrap="wrap">
                        {waPhone && (
                          <Button size="small" variant="contained" startIcon={<MessageCircle size={15} />}
                            href={`https://wa.me/${waPhone}?text=${encodeURIComponent(reminder)}`} target="_blank" sx={{ textTransform: "none" }}>
                            Enviar por WhatsApp
                          </Button>
                        )}
                        {data.artist.email && (
                          <Button size="small" variant="outlined" startIcon={<Mail size={15} />}
                            href={`mailto:${data.artist.email}?subject=${encodeURIComponent("Tu carga en la Feria del Millón")}&body=${encodeURIComponent(reminder)}`}
                            sx={{ textTransform: "none" }}>
                            Enviar por correo
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  )}

                  <Typography sx={{ ...eyebrow, color: "text.secondary" }}>Contacto</Typography>
                  <Box mt={0.5} mb={3}>
                    <Fact k="Correo" v={data.artist.email ? <a href={`mailto:${data.artist.email}`} style={{ color: "inherit" }}>{data.artist.email}</a> : "—"} />
                    <Fact k="Celular" v={data.artist.phone || "—"} />
                    <Fact k="Ciudad" v={data.artist.city || "—"} />
                    <Fact k="Cuenta desde" v={fmt(data.artist.accountSince)} />
                    <Fact k="Último ingreso" v={fmt(data.artist.lastLoginAt)} />
                  </Box>

                  <Typography sx={{ ...eyebrow, color: "text.secondary" }}>Postulación y envío</Typography>
                  <Box mt={0.5}>
                    {data.application ? (
                      <>
                        <Fact k="Postulación" v={`${APP_STATUS[data.application.status] || data.application.status}${data.application.invited ? " · invitado" : ""}${data.application.isPaid ? " · pagó inscripción" : ""}`} />
                        <Fact k="Creada" v={fmt(data.application.createdAt)} />
                        <Fact k="Inventario" v={data.application.inventorySentAt ? `Enviado el ${fmt(data.application.inventorySentAt)}` : <Box component="span" sx={{ color: "warning.main" }}>No le ha dado Enviar</Box>} />
                      </>
                    ) : (
                      <Alert severity="warning" variant="outlined" sx={{ my: 1 }}>
                        No tiene postulación (lo pusieron directo en el pabellón). Se le crea sola cuando guarde su proyecto.
                      </Alert>
                    )}
                    {data.pavilions.map((p) => (
                      <Fact key={p.name} k="Pabellón" v={`${p.name}${p.minArtworkPrice || p.maxArtworkPrice ? ` · ${formatCOP(p.minArtworkPrice)} – ${formatCOP(p.maxArtworkPrice)}` : ""}`} />
                    ))}
                    {data.otherApplications.length > 0 && (
                      <Fact k="Otras postulaciones" v={data.otherApplications.map((a) => APP_STATUS[a.status] || a.status).join(", ")} />
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Drawer>

      {data && viewer != null && (
        <ArtworkViewer
          artworks={artworks}
          index={viewer}
          artistName={data.artist.name}
          onIndex={setViewer}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
}
