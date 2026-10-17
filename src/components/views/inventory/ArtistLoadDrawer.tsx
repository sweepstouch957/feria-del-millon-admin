"use client";

import * as React from "react";
import Link from "next/link";
import {
  Avatar, Box, Button, Chip, Divider, Drawer, IconButton, LinearProgress, Stack, Typography, Alert,
} from "@mui/material";
import { ExternalLink, GalleryHorizontal, Mail, MessageCircle, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import StatusPill, { type PillTone } from "@/components/ui/StatusPill";
import { formatCOP } from "@/utils/money";
import { getInventoryStatusDetail, type InventoryStatusRow } from "@services/applications.service";

/* La ficha de un artista en "Estado de carga": lo que hay detrás de la fila.
   Contacto, postulación, el proyecto completo y sus obras una por una con lo
   que le falta a cada una, más un mensaje listo para escribirle. */

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

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box sx={{ py: 2 }}>
    <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>
      {title}
    </Typography>
    <Box mt={1}>{children}</Box>
  </Box>
);

const Fact = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <Stack direction="row" gap={1.5} sx={{ py: 0.4 }}>
    <Typography variant="body2" color="text.secondary" sx={{ width: 130, flexShrink: 0 }}>{k}</Typography>
    <Typography variant="body2" component="div" sx={{ minWidth: 0, wordBreak: "break-word" }}>{v}</Typography>
  </Stack>
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

  // Mensaje listo con lo que le falta, para no redactarlo a mano cada vez.
  const reminder = React.useMemo(() => {
    if (!row || !data) return "";
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
    return `Hola ${first}, te escribimos de la Feria del Millón. Para terminar tu carga en la plataforma te falta: ${pending.join("; ")}. Cualquier duda nos escribes. ¡Gracias!`;
  }, [row, data]);

  const phoneDigits = (data?.artist.phone || "").replace(/\D/g, "");
  const waPhone = phoneDigits.length === 10 && phoneDigits.startsWith("3") ? `57${phoneDigits}` : phoneDigits;

  return (
    <Drawer anchor="right" open={!!row} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 560 } } }}>
      {row && (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Stack direction="row" alignItems="flex-start" gap={1} sx={{ p: 2.5, pb: 1.5 }}>
            <Box flex={1} minWidth={0}>
              <Typography sx={{ fontSize: 19 }} noWrap>{row.name}</Typography>
              <Stack direction="row" gap={1} alignItems="center" mt={0.5}>
                <StatusPill label={STATE[row.state].label} tone={STATE[row.state].tone} />
                {row.pavilions.length > 0 && (
                  <Typography variant="caption" color="text.secondary" noWrap>{row.pavilions.join(" / ")}</Typography>
                )}
              </Stack>
            </Box>
            <IconButton onClick={onClose} size="small"><X size={18} /></IconButton>
          </Stack>
          {isLoading && <LinearProgress />}
          <Divider />

          <Box sx={{ px: 2.5, pb: 3, overflowY: "auto", flex: 1 }}>
            {isError && <Alert severity="error" sx={{ mt: 2 }}>No se pudo cargar la ficha.</Alert>}

            {data && (
              <>
                {row.issues.length > 0 && (
                  <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ pt: 2 }}>
                    {row.issues.map((i) => <Chip key={i} size="small" color="warning" variant="outlined" label={i} />)}
                  </Stack>
                )}

                <Section title="Contacto">
                  <Fact k="Correo" v={data.artist.email ? <a href={`mailto:${data.artist.email}`} style={{ color: "inherit" }}>{data.artist.email}</a> : "—"} />
                  <Fact k="Celular" v={data.artist.phone || "—"} />
                  <Fact k="Ciudad" v={data.artist.city || "—"} />
                  <Fact k="Cuenta desde" v={fmt(data.artist.accountSince)} />
                  <Fact k="Último ingreso" v={fmt(data.artist.lastLoginAt)} />
                  {reminder && (
                    <Stack direction="row" gap={1} mt={1.5} flexWrap="wrap">
                      {waPhone && (
                        <Button size="small" variant="contained" color="secondary" startIcon={<MessageCircle size={15} />}
                          href={`https://wa.me/${waPhone}?text=${encodeURIComponent(reminder)}`} target="_blank" sx={{ textTransform: "none" }}>
                          Escribirle por WhatsApp
                        </Button>
                      )}
                      {data.artist.email && (
                        <Button size="small" variant="outlined" startIcon={<Mail size={15} />}
                          href={`mailto:${data.artist.email}?subject=${encodeURIComponent("Tu carga en la Feria del Millón")}&body=${encodeURIComponent(reminder)}`}
                          sx={{ textTransform: "none" }}>
                          Escribirle por correo
                        </Button>
                      )}
                    </Stack>
                  )}
                  {reminder && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      El mensaje ya va escrito con lo que le falta; lo puedes editar antes de enviarlo.
                    </Typography>
                  )}
                </Section>
                <Divider />

                <Section title="Postulación y envío">
                  {data.application ? (
                    <>
                      <Fact k="Postulación" v={`${APP_STATUS[data.application.status] || data.application.status}${data.application.invited ? " · invitado" : ""}${data.application.isPaid ? " · pagó inscripción" : ""}`} />
                      <Fact k="Creada" v={fmt(data.application.createdAt)} />
                      <Fact k="Inventario" v={data.application.inventorySentAt ? `Enviado el ${fmt(data.application.inventorySentAt)}` : "No le ha dado Enviar"} />
                    </>
                  ) : (
                    <Alert severity="warning" variant="outlined">
                      No tiene postulación (lo pusieron directo en el pabellón). Se le crea sola cuando guarde su proyecto.
                    </Alert>
                  )}
                  {data.pavilions.map((p) => (
                    <Fact key={p.name} k="Pabellón" v={`${p.name}${p.minArtworkPrice || p.maxArtworkPrice ? ` · ${formatCOP(p.minArtworkPrice)} – ${formatCOP(p.maxArtworkPrice)}` : ""}`} />
                  ))}
                  {data.otherApplications.length > 0 && (
                    <Fact k="Otras postulaciones" v={data.otherApplications.map((a) => APP_STATUS[a.status] || a.status).join(", ")} />
                  )}
                </Section>
                <Divider />

                <Section title="Proyecto">
                  <Typography fontWeight={600} color={data.application?.projectTitle ? "text.primary" : "warning.main"}>
                    {data.application?.projectTitle || "Sin título"}
                  </Typography>
                  {data.application?.projectReview ? (
                    <>
                      <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-line", lineHeight: 1.6 }}>
                        {data.application.projectReview}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{words(data.application.projectReview)} palabras</Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="warning.main" mt={0.5}>Sin descripción</Typography>
                  )}
                </Section>
                <Divider />

                <Section title={`Obras (${data.totals.artworks})`}>
                  <Typography variant="body2" color="text.secondary" mb={1.5}>
                    {data.totals.copies} copias en total · valor de inventario {formatCOP(data.totals.value)}
                    {data.totals.withIssues ? ` · ${data.totals.withIssues} con algo por revisar` : ""}
                  </Typography>
                  {!data.artworks.length && <Typography variant="body2" color="text.secondary">Todavía no ha cargado obras.</Typography>}
                  <Stack divider={<Divider flexItem />}>
                    {data.artworks.map((a) => (
                      <Stack key={a.id} direction="row" gap={1.5} sx={{ py: 1.25 }}>
                        <Avatar variant="rounded" src={a.image || undefined} sx={{ width: 64, height: 64 }}>
                          <GalleryHorizontal size={18} />
                        </Avatar>
                        <Box flex={1} minWidth={0}>
                          <Stack direction="row" alignItems="center" gap={0.5}>
                            <Typography fontSize={14} fontWeight={500} noWrap>{a.title}</Typography>
                            <IconButton component={Link} href={`/inventory/artworks/${a.id}`} size="small" target="_blank">
                              <ExternalLink size={13} />
                            </IconButton>
                          </Stack>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {[a.technique, a.dimensions || "sin medidas", a.year].filter(Boolean).join(" · ")}
                          </Typography>
                          <Typography variant="caption" display="block">
                            {formatCOP(a.price)} · {a.reproducible ? `serie de ${a.stock} copia${a.stock === 1 ? "" : "s"}` : a.stock === 1 ? "obra única" : `${a.stock} unidades`}
                            {a.tagId ? ` · ${a.tagId}` : ""}
                          </Typography>
                          <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.5}>
                            <Chip size="small" variant="outlined" label={a.published ? "En el catálogo" : "Sin publicar"} />
                            {a.editUnlocked && <Chip size="small" color="warning" label={`Devuelta${a.editNote ? `: ${a.editNote}` : ""}`} />}
                            {a.issues.map((i) => <Chip key={i} size="small" color="warning" variant="outlined" label={i} />)}
                          </Stack>
                          <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
                            Cargada {fmt(a.createdAt)}{a.updatedAt && a.updatedAt !== a.createdAt ? ` · editada ${fmt(a.updatedAt)}` : ""}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Section>
              </>
            )}
          </Box>
        </Box>
      )}
    </Drawer>
  );
}
