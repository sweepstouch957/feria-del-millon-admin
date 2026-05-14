/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import * as React from "react";
import { useTheme } from "@mui/material/styles";
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
  Trash2 as Trash2Icon,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listApplications, reviewApplication, setUnderReview, markAsPaid, deleteApplication,
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
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const lastMouse = React.useRef({ x: 0, y: 0 });
  React.useEffect(() => { setIdx(startIdx); setZoom(1); setPan({ x: 0, y: 0 }); }, [startIdx]);
  React.useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [idx]);

  // Keyboard nav
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(images.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(5, z + 0.3));
      if (e.key === '-') setZoom((z) => Math.max(0.5, z - 0.3));
      if (e.key === '0') { setZoom(1); setPan({ x: 0, y: 0 }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, images.length, onClose]);

  if (!open || images.length === 0) return null;
  const img = images[idx];

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(5, z + (e.deltaY > 0 ? -0.2 : 0.2))));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setDragging(true);
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan((p) => ({ x: p.x + e.clientX - lastMouse.current.x, y: p.y + e.clientY - lastMouse.current.y }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = () => setDragging(false);
  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} PaperProps={{
      sx: { background: "rgba(0,0,0,0.97)", borderRadius: 3, maxWidth: "95vw", maxHeight: "95vh", m: 1 },
    }}>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", p: 2, gap: 2 }}>
          <Typography variant="h6" sx={{ color: "#fff", flex: 1, fontSize: 16, fontWeight: 800 }}>
            {img.title || `Imagen ${idx + 1}`}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton onClick={() => setZoom((z) => Math.max(0.5, z - 0.3))} size="small" sx={{ color: "rgba(255,255,255,0.6)", "&:hover": { color: "#fff" } }} title="Zoom out">−</IconButton>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, minWidth: 40, textAlign: "center" }}>{Math.round(zoom * 100)}%</Typography>
            <IconButton onClick={() => setZoom((z) => Math.min(5, z + 0.3))} size="small" sx={{ color: "rgba(255,255,255,0.6)", "&:hover": { color: "#fff" } }} title="Zoom in">+</IconButton>
            <IconButton onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} size="small" sx={{ color: "rgba(255,255,255,0.6)", ml: 0.5, "&:hover": { color: "#fff" } }} title="Reset zoom">⟲</IconButton>
          </Stack>
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

          <Box
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 0, overflow: "hidden", cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in', userSelect: 'none' }}
          >
            {img.url ? (
              <img
                src={img.url} alt={img.title}
                draggable={false}
                style={{
                  maxHeight: "65vh", maxWidth: "100%", objectFit: "contain", borderRadius: 8,
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transition: dragging ? 'none' : 'transform 0.2s ease',
                }}
              />
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
                border: i === idx ? "2px solid #4ade80" : "2px solid transparent", opacity: i === idx ? 1 : 0.5, transition: "all .2s",
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
  const t = useTheme();
  const dk = t.palette.mode === "dark";
  return (
    <Box sx={{ background: dk ? "rgba(255,255,255,0.04)" : "#f8fafc", border: `1px solid ${dk ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`, borderRadius: 2, p: 2, minWidth: 140, display: "flex", gap: 1.5, alignItems: "flex-start" }}>
      <Box sx={{ color: dk ? "#71717a" : "#94a3b8", mt: 0.3 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" sx={{ color: dk ? "#71717a" : "#64748b", textTransform: "uppercase", fontSize: 10, fontWeight: 700, letterSpacing: .5 }}>{label}</Typography>
        <Typography fontWeight={700} fontSize={14} sx={{ color: color || (dk ? "#fafafa" : "#1e293b") }}>{value}</Typography>
      </Box>
    </Box>
  );
}

// ─── Detail Dialog ───────────────────────────────────────────────────────────
function ApplicationDetailDialog({
  app, open, onClose, onRefresh,
}: { app: ArtistApplication | null; open: boolean; onClose: () => void; onRefresh: () => void }) {
  const muiTheme = useTheme();
  const dk = muiTheme.palette.mode === "dark";
  const [tab, setTab] = React.useState(0);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIdx, setLightboxIdx] = React.useState(0);
  const [reviewing, setReviewing] = React.useState(false);
  const [decision, setDecision] = React.useState<"accepted" | "rejected" | "">("");
  const [notes, setNotes] = React.useState("");
  const [rejReason, setRejReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState({ open: false, msg: "", sev: "success" as "success" | "error" });
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState("");
  const [deletePasswordError, setDeletePasswordError] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Reset state when dialog opens
  React.useEffect(() => { if (open) { setTab(0); setReviewing(false); setNotes(""); setRejReason(""); setDeleteDialogOpen(false); setDeletePassword(""); setDeletePasswordError(false); } }, [open]);

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

  const handleMarkAsPaid = async () => {
    if (!window.confirm("¿Seguro que deseas marcar esta postulación como pagada manualmente?")) return;
    setSaving(true);
    try {
      await markAsPaid(app._id);
      setToast({ open: true, msg: "Marcado como pagado exitosamente", sev: "success" });
      onRefresh();
    } catch (e: any) {
      setToast({ open: true, msg: e?.message || "Error", sev: "error" });
    } finally { setSaving(false); }
  };

  const handleDeleteConfirm = async () => {
    if (deletePassword !== "0123456") {
      setDeletePasswordError(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteApplication(app._id);
      setDeleteDialogOpen(false);
      onRefresh();
      onClose();
    } catch (e: any) {
      setToast({ open: true, msg: e?.message || "Error al eliminar", sev: "error" });
    } finally { setDeleting(false); }
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
                  <Box sx={{ background: dk ? "rgba(255,255,255,0.04)" : "#f8fafc", border: `1px solid ${dk ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`, borderRadius: 2, p: 2.5 }}>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8, color: dk ? "#d4d4d8" : "#475569" }}>{app.bio}</Typography>
                  </Box>
                </Box>
              )}

              {/* Project review */}
              {app.projectReview && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} mb={1} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PaletteIcon size={16} /> Reseña del proyecto
                  </Typography>
                  <Box sx={{ background: dk ? "rgba(74,222,128,0.05)" : "#f0fdf4", border: `1px solid ${dk ? 'rgba(74,222,128,0.15)' : '#bbf7d0'}`, borderRadius: 2, p: 2.5 }}>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8, color: dk ? "#86efac" : "#166534" }}>{app.projectReview}</Typography>
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
                <Box sx={{ background: dk ? "rgba(14,165,233,0.08)" : "#f0f9ff", border: `1px solid ${dk ? 'rgba(14,165,233,0.2)' : '#bae6fd'}`, borderRadius: 2, p: 2 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: dk ? '#38bdf8' : '#0369a1', display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                    📝 NOTA DEL CURADOR
                  </Typography>
                  <Typography variant="body2" color="text.primary">{app.adminNotes}</Typography>
                </Box>
              )}
              {app.rejectionReason && (
                <Box sx={{ background: dk ? "rgba(239,68,68,0.08)" : "#fef2f2", border: `1px solid ${dk ? 'rgba(239,68,68,0.2)' : '#fca5a5'}`, borderRadius: 2, p: 2 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: dk ? '#f87171' : '#dc2626', display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                    ❌ RAZÓN DE RECHAZO
                  </Typography>
                  <Typography variant="body2" color="text.primary">{app.rejectionReason}</Typography>
                </Box>
              )}
            </Stack>
          )}

          {/* Tab: Obras — organized by section */}
          {tab === 1 && (
            <Stack spacing={4}>
              {/* ─── Section 1: Obras del proyecto ─── */}
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <PaletteIcon size={18} />
                  <Typography variant="subtitle1" fontWeight={800}>Obras del proyecto</Typography>
                  <Chip label={`${app.artworkImages?.length || 0} obras`} size="small" sx={{ fontWeight: 700, fontSize: 11, bgcolor: dk ? 'rgba(74,222,128,0.12)' : '#f0fdf4', color: dk ? '#4ade80' : '#16a34a' }} />
                </Stack>

                {(!app.artworkImages || app.artworkImages.length === 0) ? (
                  <Box sx={{ textAlign: "center", py: 6, borderRadius: 3, border: `2px dashed ${dk ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`, background: dk ? 'rgba(255,255,255,0.02)' : '#fafafa' }}>
                    <ImageIcon size={40} color={dk ? '#52525b' : '#d1d5db'} />
                    <Typography color="text.secondary" mt={1.5} fontWeight={600}>Sin obras cargadas</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 2 }}>
                    {app.artworkImages.map((img, i) => (
                      <Box
                        key={i} onClick={() => openLightbox(i)}
                        sx={{
                          cursor: "pointer", borderRadius: 3, overflow: "hidden",
                          border: dk ? '1.5px solid rgba(255,255,255,0.08)' : '1.5px solid #e5e7eb',
                          transition: "all .25s cubic-bezier(.4,0,.2,1)",
                          "&:hover": { borderColor: "#4ade80", transform: "translateY(-3px)", boxShadow: "0 16px 40px rgba(74,222,128,0.15)" },
                          background: dk ? '#111113' : '#fff',
                        }}
                      >
                        <Box sx={{ height: 180, background: dk ? "rgba(255,255,255,0.03)" : "#f8f9fa", position: "relative", overflow: "hidden" }}>
                          {img.url ? (
                            <img src={img.url} alt={img.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .3s" }} />
                          ) : (
                            <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <ImageIcon size={32} color={dk ? '#52525b' : '#9ca3af'} />
                            </Box>
                          )}
                          {/* Hover overlay */}
                          <Box sx={{
                            position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
                            opacity: 0, transition: "opacity .2s", "&:hover": { opacity: 1 },
                          }}>
                            <EyeIcon size={28} color="#fff" />
                          </Box>
                        </Box>
                        <Box sx={{ p: 1.5 }}>
                          <Typography variant="subtitle2" noWrap fontWeight={700} fontSize={13} color="text.primary">{img.title || `Obra ${i + 1}`}</Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                            {img.technique && <Chip label={img.technique} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, fontWeight: 600 }} />}
                            {img.dimensions && <Typography variant="caption" color="text.secondary">{img.dimensions}</Typography>}
                            {img.year && <Typography variant="caption" color="text.secondary">· {img.year}</Typography>}
                          </Stack>
                          {img.price && (
                            <Typography variant="body2" fontWeight={800} sx={{ color: '#22c55e', mt: 0.5 }}>
                              ${img.price?.toLocaleString()} {img.currency || "COP"}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              <Divider sx={{ borderColor: dk ? 'rgba(255,255,255,0.06)' : '#f0f0f0' }} />

              {/* ─── Section 2: Imagen de detalle & Plano de montaje ─── */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3 }}>
                {/* Imagen de detalle */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                    <EyeIcon size={16} />
                    <Typography variant="subtitle2" fontWeight={800}>Imagen de detalle</Typography>
                  </Stack>
                  {app.detailImageUrl ? (
                    <Box
                      onClick={() => {
                        const detailIdx = (app.artworkImages?.length || 0);
                        openLightbox(detailIdx);
                      }}
                      sx={{
                        cursor: "pointer", borderRadius: 3, overflow: "hidden",
                        border: dk ? '2px solid rgba(255,255,255,0.08)' : '2px solid #e5e7eb',
                        transition: "all .25s", position: "relative",
                        "&:hover": { borderColor: "#4ade80", boxShadow: `0 12px 36px ${dk ? 'rgba(74,222,128,0.12)' : 'rgba(74,222,128,0.1)'}` },
                        "&:hover .zoom-overlay": { opacity: 1 },
                      }}
                    >
                      <img src={app.detailImageUrl} alt="Imagen de detalle" style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
                      <Box className="zoom-overlay" sx={{
                        position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: 0, transition: "opacity .2s",
                      }}>
                        <Stack alignItems="center" spacing={0.5}>
                          <EyeIcon size={24} color="#fff" />
                          <Typography sx={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>Ver detalle</Typography>
                        </Stack>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{
                      height: 220, borderRadius: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      border: `2px dashed ${dk ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`, background: dk ? 'rgba(255,255,255,0.02)' : '#fafafa',
                    }}>
                      <ImageIcon size={32} color={dk ? '#52525b' : '#d1d5db'} />
                      <Typography variant="caption" color="text.secondary" mt={1} fontWeight={600}>No cargada</Typography>
                    </Box>
                  )}
                </Box>

                {/* Plano de montaje */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                    <FileIcon size={16} />
                    <Typography variant="subtitle2" fontWeight={800}>Plano de montaje</Typography>
                  </Stack>
                  {app.montageImageUrl ? (
                    <Box
                      onClick={() => {
                        const montageIdx = (app.artworkImages?.length || 0) + (app.detailImageUrl ? 1 : 0);
                        openLightbox(montageIdx);
                      }}
                      sx={{
                        cursor: "pointer", borderRadius: 3, overflow: "hidden",
                        border: dk ? '2px solid rgba(255,255,255,0.08)' : '2px solid #e5e7eb',
                        transition: "all .25s", position: "relative",
                        "&:hover": { borderColor: "#4ade80", boxShadow: `0 12px 36px ${dk ? 'rgba(74,222,128,0.12)' : 'rgba(74,222,128,0.1)'}` },
                        "&:hover .zoom-overlay": { opacity: 1 },
                      }}
                    >
                      <img src={app.montageImageUrl} alt="Plano de montaje" style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
                      <Box className="zoom-overlay" sx={{
                        position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: 0, transition: "opacity .2s",
                      }}>
                        <Stack alignItems="center" spacing={0.5}>
                          <EyeIcon size={24} color="#fff" />
                          <Typography sx={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>Ver plano</Typography>
                        </Stack>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{
                      height: 220, borderRadius: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      border: `2px dashed ${dk ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`, background: dk ? 'rgba(255,255,255,0.02)' : '#fafafa',
                    }}>
                      <FileIcon size={32} color={dk ? '#52525b' : '#d1d5db'} />
                      <Typography variant="caption" color="text.secondary" mt={1} fontWeight={600}>No cargado</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Stack>
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
            <Box sx={{ mt: 3, p: 2.5, background: dk ? "rgba(255,255,255,0.03)" : "#fafafa", border: `2px solid ${dk ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`, borderRadius: 2.5 }}>
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
          <Tooltip title="Eliminar solicitud permanentemente">
            <Button
              startIcon={<Trash2Icon size={16} />}
              variant="outlined"
              color="error"
              onClick={() => { setDeletePassword(""); setDeletePasswordError(false); setDeleteDialogOpen(true); }}
              disabled={saving || deleting}
              sx={{ mr: "auto" }}
            >
              Eliminar
            </Button>
          </Tooltip>

          {!reviewing && (
            <>
              {!app.isPaid && (
                <Button startIcon={<DollarSign size={16} />} variant="outlined" color="warning" onClick={handleMarkAsPaid} disabled={saving}>
                  Marcar como pagado
                </Button>
              )}
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
          <Button onClick={onClose} variant="outlined" color="inherit">Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Trash2Icon size={18} color="#ef4444" />
          </Box>
          <Box>
            <Typography fontWeight={900} fontSize={16}>Eliminar solicitud</Typography>
            <Typography variant="caption" color="text.secondary">Esta acción no se puede deshacer</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" mb={2.5}>
            Se eliminará permanentemente la solicitud de <strong>{artist?.firstName} {artist?.lastName}</strong>. Ingresa la contraseña de administrador para continuar.
          </Typography>
          <TextField
            label="Contraseña de administrador"
            type="password"
            fullWidth
            size="small"
            value={deletePassword}
            onChange={(e) => { setDeletePassword(e.target.value); setDeletePasswordError(false); }}
            error={deletePasswordError}
            helperText={deletePasswordError ? "Contraseña incorrecta" : ""}
            onKeyDown={(e) => { if (e.key === "Enter") handleDeleteConfirm(); }}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit" disabled={deleting}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleting || !deletePassword}
            startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <Trash2Icon size={14} />}
          >
            {deleting ? "Eliminando…" : "Eliminar solicitud"}
          </Button>
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
  const t = useTheme();
  const dk = t.palette.mode === "dark";
  return (
    <Box sx={{
      display: "flex", alignItems: "center", gap: 2, p: 2,
      border: "1.5px solid", borderColor: url ? (dk ? 'rgba(255,255,255,0.1)' : '#e2e8f0') : (dk ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
      borderRadius: 2.5, background: url ? (dk ? 'rgba(255,255,255,0.03)' : '#fff') : (dk ? 'rgba(255,255,255,0.02)' : '#f8fafc'),
      transition: "all .2s", "&:hover": url ? { borderColor: '#4ade80', background: dk ? 'rgba(74,222,128,0.05)' : '#f0fdf4' } : {},
    }}>
      <Typography fontSize={28}>{icon}</Typography>
      <Box flex={1}>
        <Typography variant="subtitle2" fontWeight={700} color="text.primary">{label}</Typography>
        {url ? (
          <Typography variant="caption">
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#4ade80', textDecoration: "none", fontWeight: 600 }}>
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
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
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
          { label: "Total solicitudes", val: total, bg: isDark ? 'rgba(14,165,233,0.08)' : '#f0f9ff', border: isDark ? 'rgba(14,165,233,0.2)' : '#bae6fd', color: isDark ? '#38bdf8' : '#0369a1' },
          { label: "Pagadas", val: paid, bg: isDark ? 'rgba(34,197,94,0.08)' : '#f0fdf4', border: isDark ? 'rgba(34,197,94,0.2)' : '#bbf7d0', color: isDark ? '#4ade80' : '#16a34a' },
          { label: "Pendientes de revisión", val: submitted, bg: isDark ? 'rgba(245,158,11,0.08)' : '#fef3c7', border: isDark ? 'rgba(245,158,11,0.2)' : '#fde68a', color: isDark ? '#fbbf24' : '#92400e' },
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
                  border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                  fontSize: 13,
                  "& .MuiDataGrid-columnHeaders": {
                    background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                    borderBottom: isDark ? '2px solid rgba(255,255,255,0.06)' : '2px solid #e2e8f0',
                  },
                  "& .MuiDataGrid-columnHeaderTitle": {
                    fontWeight: 700,
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: ".3px",
                    color: isDark ? '#71717a' : '#64748b',
                  },
                  "& .MuiDataGrid-row": {
                    transition: "background .15s",
                    "&:nth-of-type(even)": { background: isDark ? 'rgba(255,255,255,0.02)' : '#fafbfc' },
                    "&:hover": { background: isDark ? 'rgba(74,222,128,0.05) !important' : '#f0f4ff !important' },
                  },
                  "& .MuiDataGrid-cell": {
                    borderBottom: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid #f1f5f9',
                    display: "flex",
                    alignItems: "center",
                  },
                  "& .MuiDataGrid-footerContainer": {
                    borderTop: isDark ? '2px solid rgba(255,255,255,0.06)' : '2px solid #e2e8f0',
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
