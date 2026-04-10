/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import * as React from "react";
import {
  Box, Card, CardContent, Stack, TextField,
  IconButton, Chip, Button, Tooltip, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Switch, FormControlLabel,
} from "@mui/material";
import {
  Plus, Pencil, Trash2, GripVertical,
  Palette, ToggleLeft, ToggleRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listTechniques,
  createTechnique,
  updateTechnique,
  deleteTechnique,
  toggleTechnique,
  type TechniqueDoc,
  type CreateTechniqueInput,
} from "@services/techniques.service";

/* ─── Slugify helper ──────────────────────────────────────────────────────── */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* ─── Form Dialog ─────────────────────────────────────────────────────────── */
function TechniqueFormDialog({
  open, onClose, existing, onSave,
}: {
  open: boolean;
  onClose: () => void;
  existing: TechniqueDoc | null;
  onSave: (payload: CreateTechniqueInput, id?: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [order, setOrder] = React.useState(0);
  const [active, setActive] = React.useState(true);

  React.useEffect(() => {
    if (open) {
      if (existing) {
        setName(existing.name);
        setSlug(existing.slug || "");
        setOrder(existing.order ?? 0);
        setActive(existing.active ?? true);
      } else {
        setName(""); setSlug(""); setOrder(0); setActive(true);
      }
    }
  }, [open, existing]);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!existing) setSlug(slugify(v));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, pb: 0 }}>
        {existing ? "Editar técnica" : "Nueva técnica"}
      </DialogTitle>
      <DialogContent sx={{ pt: "16px !important" }}>
        <Stack spacing={2.5}>
          <TextField
            label="Nombre" fullWidth size="small" required
            value={name} onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ej: Óleo sobre tela"
          />
          <TextField
            label="Slug" fullWidth size="small"
            value={slug} onChange={(e) => setSlug(e.target.value)}
            helperText="Identificador URL-friendly (auto-generado)"
            InputProps={{ sx: { fontFamily: "monospace", fontSize: 13 } }}
          />
          <TextField
            label="Orden" fullWidth size="small" type="number"
            value={order} onChange={(e) => setOrder(Number(e.target.value))}
            helperText="Menor número = primero en la lista"
          />
          <FormControlLabel
            control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
            label={active ? "Activa" : "Inactiva"}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button
          variant="contained"
          disabled={!name.trim()}
          onClick={() => { onSave({ name: name.trim(), slug: slug || slugify(name), order, active }, existing?.id); onClose(); }}
        >
          {existing ? "Guardar cambios" : "Crear técnica"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ─── Delete Confirm Dialog ───────────────────────────────────────────────── */
function ConfirmDeleteDialog({
  open, name, onClose, onConfirm, loading,
}: { open: boolean; name: string; onClose: () => void; onConfirm: () => void; loading: boolean }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>¿Eliminar técnica?</DialogTitle>
      <DialogContent>
        <Typography>
          Estás a punto de eliminar <strong>&ldquo;{name}&rdquo;</strong>. Esta acción no se puede deshacer.
          Las obras que ya usen esta técnica no se verán afectadas.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button variant="contained" color="error" onClick={onConfirm} disabled={loading}>
          {loading ? "Eliminando…" : "Eliminar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ─── MAIN PAGE ───────────────────────────────────────────────────────────── */
export default function TechniquesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TechniqueDoc | null>(null);
  const [delTarget, setDelTarget] = React.useState<TechniqueDoc | null>(null);
  const [toast, setToast] = React.useState({ open: false, msg: "", sev: "success" as "success" | "error" });

  const { data: techniques = [], isLoading } = useQuery({
    queryKey: ["techniques-admin"],
    queryFn: () => listTechniques(true),
  });

  const createMut = useMutation({
    mutationFn: (p: CreateTechniqueInput) => createTechnique(p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["techniques-admin"] }); setToast({ open: true, msg: "Técnica creada", sev: "success" }); },
    onError: (e: any) => setToast({ open: true, msg: e?.message || "Error", sev: "error" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateTechnique(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["techniques-admin"] }); setToast({ open: true, msg: "Técnica actualizada", sev: "success" }); },
    onError: (e: any) => setToast({ open: true, msg: e?.message || "Error", sev: "error" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTechnique(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["techniques-admin"] }); setToast({ open: true, msg: "Técnica eliminada", sev: "success" }); setDelTarget(null); },
    onError: (e: any) => setToast({ open: true, msg: e?.message || "Error", sev: "error" }),
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => toggleTechnique(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["techniques-admin"] }); },
    onError: (e: any) => setToast({ open: true, msg: e?.message || "Error", sev: "error" }),
  });

  const handleSave = (payload: CreateTechniqueInput, id?: string) => {
    if (id) {
      updateMut.mutate({ id, payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const activeCount = techniques.filter((t) => t.active).length;
  const inactiveCount = techniques.filter((t) => !t.active).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: "auto" }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
            <Palette size={28} />
            <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: "-0.5px" }}>
              Técnicas artísticas
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Gestiona las técnicas disponibles para clasificar obras · {techniques.length} en total
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => { setEditing(null); setFormOpen(true); }}
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
        >
          Nueva técnica
        </Button>
      </Stack>

      {/* Stats */}
      <Stack direction="row" spacing={2} mb={3}>
        <Box sx={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 2, px: 3, py: 1.5, flex: 1 }}>
          <Typography variant="caption" fontWeight={700} color="#16a34a" sx={{ textTransform: "uppercase", fontSize: 10 }}>Activas</Typography>
          <Typography variant="h5" fontWeight={900} color="#16a34a">{activeCount}</Typography>
        </Box>
        <Box sx={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 2, px: 3, py: 1.5, flex: 1 }}>
          <Typography variant="caption" fontWeight={700} color="#dc2626" sx={{ textTransform: "uppercase", fontSize: 10 }}>Inactivas</Typography>
          <Typography variant="h5" fontWeight={900} color="#dc2626">{inactiveCount}</Typography>
        </Box>
        <Box sx={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 2, px: 3, py: 1.5, flex: 1 }}>
          <Typography variant="caption" fontWeight={700} color="#0369a1" sx={{ textTransform: "uppercase", fontSize: 10 }}>Total</Typography>
          <Typography variant="h5" fontWeight={900} color="#0369a1">{techniques.length}</Typography>
        </Box>
      </Stack>

      {/* Table */}
      <Card sx={{ borderRadius: 3, boxShadow: "0 4px 24px rgba(0,0,0,.06)" }}>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 6, textAlign: "center", color: "text.secondary" }}>Cargando técnicas…</Box>
          ) : techniques.length === 0 ? (
            <Box sx={{ p: 6, textAlign: "center" }}>
              <Palette size={48} color="#d1d5db" />
              <Typography color="text.secondary" mt={2}>No hay técnicas creadas aún</Typography>
              <Button
                variant="outlined" sx={{ mt: 2 }}
                onClick={() => { setEditing(null); setFormOpen(true); }}
              >
                Crear primera técnica
              </Button>
            </Box>
          ) : (
            <Box sx={{ overflow: "auto" }}>
              {/* Table header */}
              <Box sx={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 150px 80px 80px 120px",
                gap: 1, px: 2.5, py: 1.5,
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                fontSize: 11, fontWeight: 700, color: "#64748b",
                textTransform: "uppercase", letterSpacing: ".5px",
              }}>
                <span>#</span>
                <span>Nombre</span>
                <span>Slug</span>
                <span style={{ textAlign: "center" }}>Orden</span>
                <span style={{ textAlign: "center" }}>Estado</span>
                <span style={{ textAlign: "center" }}>Acciones</span>
              </Box>
              {/* Rows */}
              {techniques.map((t, i) => (
                <Box
                  key={t.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr 150px 80px 80px 120px",
                    gap: 1, px: 2.5, py: 1.5,
                    alignItems: "center",
                    borderBottom: "1px solid #f1f5f9",
                    transition: "background .15s",
                    "&:hover": { background: "#f8fafc" },
                    opacity: t.active ? 1 : 0.5,
                  }}
                >
                  <Typography variant="body2" color="text.secondary" fontSize={12}>{i + 1}</Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Palette size={16} color={t.active ? "#7c3aed" : "#9ca3af"} />
                    <Typography fontWeight={700} fontSize={14}>{t.name}</Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 12, color: "#94a3b8" }}>
                    {t.slug || "—"}
                  </Typography>
                  <Typography variant="body2" textAlign="center" fontWeight={600}>{t.order ?? 0}</Typography>
                  <Box sx={{ textAlign: "center" }}>
                    <Chip
                      size="small"
                      label={t.active ? "Activa" : "Inactiva"}
                      color={t.active ? "success" : "default"}
                      variant={t.active ? "filled" : "outlined"}
                      sx={{ fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                      onClick={() => toggleMut.mutate(t.id)}
                    />
                  </Box>
                  <Stack direction="row" justifyContent="center" spacing={0.5}>
                    <Tooltip title={t.active ? "Desactivar" : "Activar"}>
                      <IconButton size="small" onClick={() => toggleMut.mutate(t.id)}>
                        {t.active ? <ToggleRight size={16} color="#16a34a" /> : <ToggleLeft size={16} color="#9ca3af" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => { setEditing(t); setFormOpen(true); }}>
                        <Pencil size={15} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => setDelTarget(t)}>
                        <Trash2 size={15} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Form dialog */}
      <TechniqueFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        existing={editing}
        onSave={handleSave}
      />

      {/* Delete confirm */}
      <ConfirmDeleteDialog
        open={!!delTarget}
        name={delTarget?.name || ""}
        onClose={() => setDelTarget(null)}
        onConfirm={() => delTarget && deleteMut.mutate(delTarget.id)}
        loading={deleteMut.isPending}
      />

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <Alert severity={toast.sev} variant="filled">{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
