/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import * as React from "react";
import {
  Box, Card, CardHeader, CardContent, Stack, TextField, InputAdornment,
  IconButton, Select, MenuItem, FormControl, InputLabel, Chip, Button,
  Tooltip, Typography, Divider, Dialog, DialogTitle, DialogContent,
  DialogActions, Snackbar, Alert, LinearProgress, Avatar, Badge,
  Tab, Tabs, CircularProgress,
} from "@mui/material";
import { DataGrid, type GridColDef, type GridRenderCellParams, type GridPaginationModel } from "@mui/x-data-grid";
import {
  Search as SearchIcon, RefreshCcw as RefreshIcon, Eye as EyeIcon,
  CheckCircle as CheckCircleIcon, XCircle as XCircleIcon, Clock as ClockIcon,
  ChevronLeft, ChevronRight, X as XIcon, FileText as FileIcon,
  Image as ImageIcon, Palette as PaletteIcon, User as UserIcon,
  Mail as MailIcon, Phone as PhoneIcon, MapPin as MapPinIcon,
  Instagram as InstagramIcon, Calendar as CalendarIcon, DollarSign,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listApplications, reviewApplication, setUnderReview,
  type ArtistApplication, type ArtworkImageEntry,
} from "@services/applications.service";

const STATUS_CONFIG: Record<string, { label: string; color: "default" | "primary" | "success" | "warning" | "info" | "error" }> = {
  pending_payment: { label: "Pago pendiente", color: "warning" },
  draft: { label: "Borrador", color: "info" },
  submitted: { label: "Enviada", color: "primary" },
  under_review: { label: "En revisión", color: "info" },
  accepted: { label: "Aceptada", color: "success" },
  rejected: { label: "Rechazada", color: "error" },
};

// ─── Lightbox ────────────────────────────────────────────────────────────────
function ImageLightbox({ images, open, startIdx, onClose }: {
  images: ArtworkImageEntry[];
  open: boolean;
  startIdx: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = React.useState(startIdx);
  React.useEffect(() => { setIdx(startIdx); }, [startIdx]);

  if (!open || images.length === 0) return null;
  const img = images[idx];

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} PaperProps={{
      sx: { background: "rgba(0,0,0,0.97)", borderRadius: 3, maxWidth: "95vw", maxHeight: "95vh", m: 1 },
    }}>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", p: 2, gap: 2 }}>
          <Typography variant="h6" sx={{ color: "#fff", flex: 1, fontSize: 16 }}>
            {img.title || `Imagen ${idx + 1}`}
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
            {idx + 1} / {images.length}
          </Typography>
          <IconButton onClick={onClose} sx={{ color: "#fff" }}><XIcon size={20} /></IconButton>
        </Box>

        <Box sx={{ flex: 1, display: "flex", alignItems: "center", px: 2, gap: 2, minHeight: 0, position: "relative" }}>
          <IconButton
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            sx={{ color: "#fff", background: "rgba(255,255,255,0.1)", flexShrink: 0, "&:hover": { background: "rgba(255,255,255,0.2)" } }}
          ><ChevronLeft size={24} /></IconButton>

          <Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 0 }}>
            {img.url ? (
              <img src={img.url} alt={img.title} style={{ maxHeight: "65vh", maxWidth: "100%", objectFit: "contain", borderRadius: 8 }} />
            ) : (
              <Box sx={{ width: 400, height: 300, background: "#222", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ImageIcon size={64} color="rgba(255,255,255,0.2)" />
              </Box>
            )}
          </Box>

          <IconButton
            onClick={() => setIdx((i) => Math.min(images.length - 1, i + 1))}
            disabled={idx === images.length - 1}
            sx={{ color: "#fff", background: "rgba(255,255,255,0.1)", flexShrink: 0, "&:hover": { background: "rgba(255,255,255,0.2)" } }}
          ><ChevronRight size={24} /></IconButton>
        </Box>

        <Box sx={{ p: 2, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <Stack direction="row" spacing={3} flexWrap="wrap">
            {img.technique && <Box><Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Técnica</Typography><Typography sx={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{img.technique}</Typography></Box>}
            {img.dimensions && <Box><Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Dimensiones</Typography><Typography sx={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{img.dimensions}</Typography></Box>}
            {img.year && <Box><Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Año</Typography><Typography sx={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{img.year}</Typography></Box>}
            {img.price && <Box><Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Precio</Typography><Typography sx={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>${img.price?.toLocaleString()} {img.currency || "COP"}</Typography></Box>}
          </Stack>
        </Box>

        <Box sx={{ display: "flex", gap: 1, p: 2, overflowX: "auto", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          {images.map((im, i) => (
            <Box
              key={i} onClick={() => setIdx(i)}
              sx={{ width: 64, height: 64, flexShrink: 0, cursor: "pointer", borderRadius: 1, overflow: "hidden",
                border: i === idx ? "2px solid #7c3aed" : "2px solid transparent", opacity: i === idx ? 1 : 0.5, transition: "all .2s",
                "&:hover": { opacity: 1 }, background: "#111",
              }}
            >
              {im.url ? <img src={im.url} alt={im.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={20} color="rgba(255,255,255,0.3)" /></Box>}
            </Box>
          ))}
        </Box>
      </Box>
    </Dialog>
  );
}

// ─── Meta card helper ────────────────────────────────────────────────────────
function MetaCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <Box sx={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 2, p: 2, minWidth: 140, display: "flex", gap: 1.5, alignItems: "flex-start" }}>
      <Box sx={{ color: "#94a3b8", mt: 0.3 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" sx={{ color: "#64748b", textTransform: "uppercase", fontSize: 10, fontWeight: 700, letterSpacing: .5 }}>{label}</Typography>
        <Typography fontWeight={700} fontSize={14} sx={{ color: color || "#1e293b" }}>{value}</Typography>
      </Box>
    </Box>
  );
}

// ─── Detail Dialog ───────────────────────────────────────────────────────────
function ApplicationDetailDialog({
  app, open, onClose, onRefresh,
}: { app: ArtistApplication | null; open: boolean; onClose: () => void; onRefresh: () => void }) {
  const [tab, setTab] = React.useState(0);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIdx, setLightboxIdx] = React.useState(0);
  const [reviewing, setReviewing] = React.useState(false);
  const [decision, setDecision] = React.useState<"accepted" | "rejected" | "">("");
  const [notes, setNotes] = React.useState("");
  const [rejReason, setRejReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState({ open: false, msg: "", sev: "success" as "success" | "error" });

  // Reset state when dialog opens
  React.useEffect(() => { if (open) { setTab(0); setReviewing(false); setNotes(""); setRejReason(""); } }, [open]);

  if (!app) return null;

  const artist = typeof app.artist === "object" ? app.artist : null;
  const conv = typeof app.convocatoria === "object" ? app.convocatoria : null;
  const allImages: ArtworkImageEntry[] = [
    ...(app.artworkImages || []),
    ...(app.detailImageUrl ? [{ url: app.detailImageUrl, title: "Imagen de detalle", role: "detail" as const }] : []),
    ...(app.montageImageUrl ? [{ url: app.montageImageUrl, title: "Plano de montaje", role: "montage" as const }] : []),
  ];

  const openLightbox = (i: number) => { setLightboxIdx(i); setLightboxOpen(true); };

  const handleSetUnderReview = async () => {
    setSaving(true);
    try {
      await setUnderReview(app._id);
      setToast({ open: true, msg: "Estado actualizado a En Revisión", sev: "success" });
      onRefresh();
    } catch (e: any) {
      setToast({ open: true, msg: e?.message || "Error", sev: "error" });
    } finally { setSaving(false); }
  };

  const handleReview = async () => {
    if (!decision) return;
    setSaving(true);
    try {
      await reviewApplication(app._id, decision, { notes, rejectionReason: rejReason });
      setToast({ open: true, msg: `Postulación ${decision === "accepted" ? "aceptada" : "rechazada"} y notificación enviada`, sev: "success" });
      setReviewing(false);
      onRefresh();
      onClose();
    } catch (e: any) {
      setToast({ open: true, msg: e?.message || "Error", sev: "error" });
    } finally { setSaving(false); }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{
        sx: { borderRadius: 3, overflow: "hidden" }
      }}>
        {/* Header with profile photo */}
        <Box sx={{ background: "#0a0a0a", p: 3, pb: 2.5, color: "#fff", borderBottom: "4px solid #4ade80" }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            {app.profilePhotoUrl ? (
              <Avatar src={app.profilePhotoUrl} sx={{ width: 64, height: 64, border: "3px solid #4ade80", boxShadow: "0 4px 12px rgba(74, 222, 128, 0.2)" }} />
            ) : (
              <Avatar sx={{ width: 64, height: 64, bgcolor: "#111", color: "#4ade80", fontSize: 24, fontWeight: 800, border: "2px solid #4ade80", boxShadow: "0 4px 12px rgba(74, 222, 128, 0.2)" }}>
                {artist?.firstName?.[0]}{artist?.lastName?.[0]}
              </Avatar>
            )}
            <Box flex={1}>
              <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: "-0.5px" }}>
                {artist?.firstName} {artist?.lastName}
              </Typography>
              <Stack direction="row" spacing={2.5} flexWrap="wrap" sx={{ mt: 0.5, opacity: 0.9 }}>
                {artist?.email && <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "#cbd5e1" }}><MailIcon size={14} color="#4ade80" />{artist.email}</Typography>}
                {artist?.mobile && <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "#cbd5e1" }}><PhoneIcon size={14} color="#4ade80" />{artist.mobile}</Typography>}
                {artist?.city && <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "#cbd5e1" }}><MapPinIcon size={14} color="#4ade80" />{artist.city}</Typography>}
              </Stack>
            </Box>
            <Chip
              label={STATUS_CONFIG[app.status]?.label || app.status}
              color={STATUS_CONFIG[app.status]?.color || "default"}
              sx={{ fontWeight: 800, fontSize: 12, height: 30, px: 0.5, ...(app.status === 'accepted' ? { bgcolor: '#4ade80', color: '#000' } : {}) }}
            />
            <IconButton onClick={onClose} sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.1)" } }}><XIcon size={20} /></IconButton>
          </Stack>
          {conv && (
            <Typography variant="body2" sx={{ mt: 2, opacity: 0.8, pl: 10, fontWeight: 600, color: "#cbd5e1" }}>
              {conv.name} <span style={{ color: '#4ade80', margin: '0 8px' }}>•</span> Inscripción {conv.fee ? `$${conv.fee.toLocaleString()} ${conv.currency || "COP"}` : ""}
            </Typography>
          )}
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          px: 3, borderBottom: "1px solid", borderColor: "divider",
          "& .MuiTabs-indicator": { backgroundColor: "#16a34a", height: 3, borderRadius: "3px 3px 0 0" },
          "& .MuiTab-root": { textTransform: "none", fontWeight: 700, fontSize: 14, minHeight: 48, color: "#64748b" },
          "& .MuiTab-root.Mui-selected": { color: "#16a34a" },
        }}>
          <Tab icon={<UserIcon size={16} />} label="Perfil y proyecto" iconPosition="start" />
          <Tab icon={<ImageIcon size={16} />} label={`Obras (${app.artworkImages?.length || 0})`} iconPosition="start" />
          <Tab icon={<FileIcon size={16} />} label="Documentos" iconPosition="start" />
        </Tabs>

        <DialogContent sx={{ p: 3 }}>
          {/* Tab: Perfil y proyecto */}
          {tab === 0 && (
            <Stack spacing={3}>
              {/* Quick stats */}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1.5 }}>
                <MetaCard icon={<DollarSign size={16} />} label="Pago" value={app.isPaid ? "✅ Confirmado" : "⏳ Pendiente"} color={app.isPaid ? "#16a34a" : "#d97706"} />
                <MetaCard icon={<ImageIcon size={16} />} label="Obras cargadas" value={`${app.artworkImages?.length || 0} / 15`} />
                <MetaCard icon={<CalendarIcon size={16} />} label="Enviada" value={app.submittedAt ? new Date(app.submittedAt).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" }) : "—"} />
                <MetaCard icon={<MapPinIcon size={16} />} label="Ciudad" value={artist?.city || "—"} />
              </Box>

              {/* Bio */}
              {app.bio && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} mb={1} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <UserIcon size={16} /> Biografía del artista
                  </Typography>
                  <Box sx={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 2, p: 2.5 }}>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8, color: "#475569" }}>{app.bio}</Typography>
                  </Box>
                </Box>
              )}

              {/* Project review */}
              {app.projectReview && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} mb={1} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PaletteIcon size={16} /> Reseña del proyecto
                  </Typography>
                  <Box sx={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 2, p: 2.5 }}>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8, color: "#166534" }}>{app.projectReview}</Typography>
                  </Box>
                </Box>
              )}

              {/* Instagram */}
              {(artist as any)?.instagram && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <InstagramIcon size={16} />
                  <Typography variant="body2" fontWeight={600}>{(artist as any).instagram}</Typography>
                </Stack>
              )}

              {/* Admin notes */}
              {app.adminNotes && (
                <Box sx={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 2, p: 2 }}>
                  <Typography variant="caption" fontWeight={700} color="#0369a1" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                    📝 NOTA DEL CURADOR
                  </Typography>
                  <Typography variant="body2">{app.adminNotes}</Typography>
                </Box>
              )}
              {app.rejectionReason && (
                <Box sx={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 2, p: 2 }}>
                  <Typography variant="caption" fontWeight={700} color="#dc2626" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                    ❌ RAZÓN DE RECHAZO
                  </Typography>
                  <Typography variant="body2">{app.rejectionReason}</Typography>
                </Box>
              )}
            </Stack>
          )}

          {/* Tab: Obras */}
          {tab === 1 && (
            <Box>
              {allImages.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <ImageIcon size={48} color="#d1d5db" />
                  <Typography color="text.secondary" mt={2}>Sin imágenes cargadas</Typography>
                </Box>
              ) : (
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 2 }}>
                  {allImages.map((img, i) => (
                    <Box
                      key={i} onClick={() => openLightbox(i)}
                      sx={{ cursor: "pointer", borderRadius: 2.5, overflow: "hidden", border: "1.5px solid #e5e7eb",
                        transition: "all .2s", "&:hover": { borderColor: "#7c3aed", transform: "translateY(-2px)", boxShadow: "0 12px 32px rgba(124,58,237,0.15)" },
                      }}
                    >
                      <Box sx={{ height: 160, background: "#f3f4f6", position: "relative" }}>
                        {img.url ? (
                          <img src={img.url} alt={img.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <ImageIcon size={32} color="#9ca3af" />
                          </Box>
                        )}
                        {img.role && (
                          <Chip label={img.role === "detail" ? "Detalle" : img.role === "montage" ? "Montaje" : img.role} size="small" sx={{ position: "absolute", top: 8, left: 8, fontSize: 10, fontWeight: 700, bgcolor: "rgba(0,0,0,0.7)", color: "#fff" }} />
                        )}
                      </Box>
                      <Box sx={{ p: 1.5 }}>
                        <Typography variant="subtitle2" noWrap fontWeight={700} fontSize={13}>{img.title || `Imagen ${i + 1}`}</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {img.technique && <Typography variant="caption" color="text.secondary" noWrap>{img.technique}</Typography>}
                          {img.year && <Typography variant="caption" color="text.secondary">· {img.year}</Typography>}
                        </Stack>
                        {img.price && <Typography variant="caption" fontWeight={700} color="primary">${img.price?.toLocaleString()} {img.currency || "COP"}</Typography>}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Tab: Documentos */}
          {tab === 2 && (
            <Stack spacing={2}>
              <DocLink label="CV del artista" url={app.cvUrl} icon="📄" type="PDF" />
              <DocLink label="Foto de perfil" url={app.profilePhotoUrl} icon="🖼️" type="Imagen" />
              <DocLink label="Imagen de detalle" url={app.detailImageUrl} icon="🔍" type="Imagen" />
              <DocLink label="Plano de montaje" url={app.montageImageUrl} icon="📐" type="Imagen" />
            </Stack>
          )}

          {/* Review panel */}
          {reviewing && (
            <Box sx={{ mt: 3, p: 2.5, background: "#fafafa", border: "2px solid #e5e7eb", borderRadius: 2.5 }}>
              <Typography variant="subtitle2" fontWeight={800} mb={2} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                ⚖️ Emitir resolución
              </Typography>
              <Stack spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Decisión</InputLabel>
                  <Select value={decision} label="Decisión" onChange={(e) => setDecision(e.target.value as any)}>
                    <MenuItem value="accepted">✅ Aceptar postulación</MenuItem>
                    <MenuItem value="rejected">❌ Rechazar postulación</MenuItem>
                  </Select>
                </FormControl>
                <TextField label="Notas del curador (visibles al artista)" multiline rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth size="small" />
                {decision === "rejected" && (
                  <TextField label="Razón de rechazo *" multiline rows={2} value={rejReason} onChange={(e) => setRejReason(e.target.value)} fullWidth size="small" required />
                )}
              </Stack>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, borderTop: "1px solid", borderColor: "divider", gap: 1 }}>
          {!reviewing && (
            <>
              {app.status === "submitted" && (
                <Button startIcon={<ClockIcon size={16} />} variant="outlined" onClick={handleSetUnderReview} disabled={saving}>
                  Marcar en revisión
                </Button>
              )}
              {["submitted", "under_review"].includes(app.status) && (
                <Button
                  startIcon={<CheckCircleIcon size={16} />}
                  variant="contained" color="success"
                  onClick={() => { setDecision("accepted"); setReviewing(true); }}
                >
                  Aceptar
                </Button>
              )}
              {["submitted", "under_review"].includes(app.status) && (
                <Button
                  startIcon={<XCircleIcon size={16} />}
                  variant="contained" color="error"
                  onClick={() => { setDecision("rejected"); setReviewing(true); }}
                >
                  Rechazar
                </Button>
              )}
            </>
          )}
          {reviewing && (
            <>
              <Button onClick={() => setReviewing(false)} color="inherit">Cancelar</Button>
              <Button variant="contained" onClick={handleReview} disabled={saving || !decision || (decision === "rejected" && !rejReason)}>
                {saving ? <CircularProgress size={18} /> : "Confirmar y notificar"}
              </Button>
            </>
          )}
          <Box flex={1} />
          <Button onClick={onClose} variant="outlined" color="inherit">Cerrar</Button>
        </DialogActions>
      </Dialog>

      <ImageLightbox images={allImages} open={lightboxOpen} startIdx={lightboxIdx} onClose={() => setLightboxOpen(false)} />

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <Alert severity={toast.sev} variant="filled">{toast.msg}</Alert>
      </Snackbar>
    </>
  );
}

function DocLink({ label, url, icon, type }: { label: string; url?: string; icon: string; type?: string }) {
  return (
    <Box sx={{
      display: "flex", alignItems: "center", gap: 2, p: 2,
      border: "1.5px solid", borderColor: url ? "#e2e8f0" : "#f1f5f9",
      borderRadius: 2.5, background: url ? "#fff" : "#f8fafc",
      transition: "all .2s", "&:hover": url ? { borderColor: "#7c3aed", background: "#faf5ff" } : {},
    }}>
      <Typography fontSize={28}>{icon}</Typography>
      <Box flex={1}>
        <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
        {url ? (
          <Typography variant="caption">
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#7c3aed", textDecoration: "none", fontWeight: 600 }}>
              Ver {type || "documento"} ↗
            </a>
          </Typography>
        ) : (
          <Typography variant="caption" color="text.disabled">No cargado</Typography>
        )}
      </Box>
      <Chip size="small" label={url ? "✅ Cargado" : "—"} color={url ? "success" : "default"} variant={url ? "filled" : "outlined"} sx={{ fontSize: 11 }} />
    </Box>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function SolicitudesPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = React.useState("");
  const [filterPaid, setFilterPaid] = React.useState("");
  const [q, setQ] = React.useState("");
  const [pagination, setPagination] = React.useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  
  const [selectedApp, setSelectedApp] = React.useState<ArtistApplication | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [toast, setToast] = React.useState({ open: false, msg: "", sev: "success" as "success" | "error" });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["applications", filterStatus, filterPaid, q, pagination.page, pagination.pageSize],
    queryFn: () => listApplications({
      status: filterStatus || undefined,
      isPaid: filterPaid === "" ? undefined : filterPaid === "true",
      q: q || undefined,
      page: pagination.page + 1,
      limit: pagination.pageSize,
    }),
  });

  const handleView = (app: ArtistApplication) => {
    setSelectedApp(app);
    setDetailOpen(true);
  };

  const columns: GridColDef[] = React.useMemo(() => [
    {
      field: "artist", headerName: "Artista", flex: 1, minWidth: 220,
      renderCell: (p: GridRenderCellParams<ArtistApplication>) => {
        const a = p.row?.artist as any;
        const photoUrl = p.row?.profilePhotoUrl;
        return (
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {photoUrl ? (
              <Avatar src={photoUrl} sx={{ width: 32, height: 32 }} />
            ) : (
              <Avatar sx={{ width: 32, height: 32, fontSize: 11, bgcolor: "#7c3aed" }}>
                {a?.firstName?.[0]}{a?.lastName?.[0]}
              </Avatar>
            )}
            <Box>
              <Typography variant="body2" fontWeight={700} fontSize={13}>{a?.firstName} {a?.lastName}</Typography>
            </Box>
          </Stack>
        );
      },
    },
    {
      field: "convocatoria", headerName: "Convocatoria", width: 200,
      renderCell: (p) => (p.row?.convocatoria as any)?.name || "—",
    },
    {
      field: "status", headerName: "Estado", width: 145,
      renderCell: (p) => (
        <Chip
          size="small"
          label={STATUS_CONFIG[p.row?.status]?.label || p.row?.status}
          color={STATUS_CONFIG[p.row?.status]?.color || "default"}
          sx={{ fontWeight: 700, fontSize: 11 }}
        />
      ),
    },
    {
      field: "isPaid", headerName: "Pago", width: 110,
      renderCell: (p) => p.row?.isPaid
        ? <Chip size="small" color="success" label="✅ Pagado" sx={{ fontSize: 11 }} />
        : <Chip size="small" color="warning" label="⏳ Pendiente" sx={{ fontSize: 11 }} />,
    },
    {
      field: "artworkImages", headerName: "Obras", width: 80, align: "center", headerAlign: "center",
      renderCell: (p) => (
        <Badge badgeContent={(p.row?.artworkImages?.length) || 0} color="primary" max={99}>
          <ImageIcon size={18} />
        </Badge>
      ),
    },
    {
      field: "submittedAt", headerName: "Enviada", width: 120,
      renderCell: (p) => p.row?.submittedAt ? new Date(p.row.submittedAt).toLocaleDateString("es-CO") : "—",
    },
    {
      field: "actions", headerName: "Acciones", width: 100, sortable: false, align: "center", headerAlign: "center",
      renderCell: (p) => (
        <Tooltip title="Ver detalle">
          <IconButton size="small" onClick={() => handleView(p.row)} color="primary">
            <EyeIcon size={18} />
          </IconButton>
        </Tooltip>
      ),
    },
  ], []);

  const rows = React.useMemo(() =>
    (data?.docs || []).map((d) => ({ ...d, id: d._id })),
    [data?.docs]
  );

  // Quick stats
  const total = data?.total || 0;
  const paid = rows.filter((r) => r.isPaid).length;
  const submitted = rows.filter((r) => ["submitted", "under_review"].includes(r.status)).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      {/* Stats bar */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
        {[
          { label: "Total solicitudes", val: total, bg: "#f0f9ff", border: "#bae6fd", color: "#0369a1" },
          { label: "Pagadas", val: paid, bg: "#f0fdf4", border: "#bbf7d0", color: "#16a34a" },
          { label: "Pendientes de revisión", val: submitted, bg: "#fef3c7", border: "#fde68a", color: "#92400e" },
        ].map((s) => (
          <Box key={s.label} sx={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 2, px: 3, py: 2, minWidth: 160 }}>
            <Typography variant="caption" fontWeight={700} sx={{ color: s.color, textTransform: "uppercase", fontSize: 10, letterSpacing: .5 }}>{s.label}</Typography>
            <Typography variant="h5" fontWeight={900} sx={{ color: s.color }}>{s.val}</Typography>
          </Box>
        ))}
      </Stack>

      <Card sx={{ borderRadius: 3, boxShadow: "0 4px 24px rgba(0,0,0,.06)" }}>
        <CardHeader
          avatar={<PaletteIcon size={24} />}
          title={<Typography variant="h6" fontWeight={800}>Solicitudes de artistas</Typography>}
          subheader={<Typography variant="body2" color="text.secondary">
            Gestiona las postulaciones a convocatorias
          </Typography>}
          action={
            <Tooltip title="Refrescar">
              <IconButton onClick={() => refetch()}><RefreshIcon size={18} /></IconButton>
            </Tooltip>
          }
        />
        <Divider />
        <CardContent>
          <Stack spacing={2}>
            {/* Filters */}
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
              <TextField
                size="small" label="Buscar artista" value={q}
                onChange={(e) => { setQ(e.target.value); setPagination((p) => ({ ...p, page: 0 })); }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon size={16} /></InputAdornment> }}
                sx={{ minWidth: 240 }}
              />
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <InputLabel>Estado</InputLabel>
                <Select value={filterStatus} label="Estado" onChange={(e) => { setFilterStatus(e.target.value); setPagination({ page: 0, pageSize: 20 }); }}>
                  <MenuItem value="">Todos</MenuItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <MenuItem key={k} value={k}><Chip size="small" label={v.label} color={v.color} sx={{ fontSize: 11 }} /></MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Pago</InputLabel>
                <Select value={filterPaid} label="Pago" onChange={(e) => { setFilterPaid(e.target.value); setPagination({ page: 0, pageSize: 20 }); }}>
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="true">✅ Pagados</MenuItem>
                  <MenuItem value="false">⏳ Sin pago</MenuItem>
                </Select>
              </FormControl>
              <Box flex={1} />
              <Button variant="outlined" startIcon={<RefreshIcon size={16} />} onClick={() => refetch()}>
                Actualizar
              </Button>
            </Stack>

            {/* Table */}
            <Box sx={{ position: "relative" }}>
              {isLoading && <LinearProgress sx={{ position: "absolute", top: -10, left: 0, right: 0 }} />}
              <DataGrid
                autoHeight disableRowSelectionOnClick
                rows={rows} columns={columns}
                getRowId={(r) => r._id || r.id}
                rowCount={data?.total || 0}
                paginationMode="server"
                paginationModel={pagination}
                onPaginationModelChange={setPagination}
                pageSizeOptions={[10, 20, 50]}
                loading={isLoading}
                rowHeight={64}
                columnHeaderHeight={48}
                sx={{
                  borderRadius: 2.5,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                  "& .MuiDataGrid-columnHeaders": {
                    background: "#f8fafc",
                    borderBottom: "2px solid #e2e8f0",
                  },
                  "& .MuiDataGrid-columnHeaderTitle": {
                    fontWeight: 700,
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: ".3px",
                    color: "#64748b",
                  },
                  "& .MuiDataGrid-row": {
                    transition: "background .15s",
                    "&:nth-of-type(even)": { background: "#fafbfc" },
                    "&:hover": { background: "#f0f4ff !important" },
                  },
                  "& .MuiDataGrid-cell": {
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                  },
                  "& .MuiDataGrid-footerContainer": {
                    borderTop: "2px solid #e2e8f0",
                  },
                }}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <ApplicationDetailDialog
        app={selectedApp} open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onRefresh={() => refetch()}
      />

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <Alert severity={toast.sev} variant="filled">{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
