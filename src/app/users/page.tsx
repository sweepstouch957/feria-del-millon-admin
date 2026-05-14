/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import {
  Box, Stack, Typography, TextField, InputAdornment, IconButton,
  Select, MenuItem, FormControl, InputLabel, Chip, Button, Tooltip,
  Dialog, DialogContent, DialogActions, Snackbar, Alert, LinearProgress,
  Avatar, Paper, Skeleton, Tabs, Tab, Switch, Divider, CircularProgress, alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  DataGrid, type GridColDef, type GridRenderCellParams, type GridPaginationModel,
} from "@mui/x-data-grid";
import {
  Search, RefreshCcw, Pencil, Eye, Save, X, Users,
  Mail, Phone, MapPin, Instagram, Facebook, Globe, Calendar,
  CheckCircle2, XCircle, Shield, Clock, User as UserIcon,
} from "lucide-react";

import { useUsers, useDebouncedValue } from "@/hooks/useAuth";
import { useCities } from "@/hooks/useCities";
import {
  getUserById, updateUser,
  type UsersSearchParams, type UserDTO, type Roles as RolesMap,
} from "@services/user.service";

// ── Design tokens ─────────────────────────────────────────────────────────────
const G   = "#22c55e";
const GD  = "#16a34a";
const S1  = "#111113";
const BR  = "rgba(255,255,255,0.07)";
const TM  = "rgba(255,255,255,0.38)";

// ── Role config ───────────────────────────────────────────────────────────────
const ROLES: { key: keyof RolesMap; label: string; desc: string; color: string }[] = [
  { key: "superuser", label: "Superuser", desc: "Acceso total al sistema",     color: "#ef4444" },
  { key: "staff",     label: "Staff",     desc: "Gestión operativa",           color: "#a78bfa" },
  { key: "curador",   label: "Curador",   desc: "Curación y validación obras", color: "#60a5fa" },
  { key: "cajero",    label: "Cajero",    desc: "Caja y manejo de pagos",      color: "#f59e0b" },
  { key: "artista",   label: "Artista",   desc: "Perfil de artista activo",    color: G         },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(u: Partial<UserDTO>) {
  const f = u.firstName?.[0] || "";
  const l = u.lastName?.[0] || "";
  return (f + l).toUpperCase() || (u.email?.[0] || "?").toUpperCase();
}

function hashColor(str = "") {
  const palette = [G, "#60a5fa", "#a78bfa", "#f59e0b", "#f472b6", "#34d399", "#fb923c"];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % palette.length;
  return palette[h];
}

function fmtDate(s?: string | null, withTime = false) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-CO", {
    year: "numeric", month: "short", day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

// ── RoleBadge ─────────────────────────────────────────────────────────────────
function RoleBadge({ roleKey }: { roleKey: keyof RolesMap }) {
  const r = ROLES.find(x => x.key === roleKey);
  if (!r) return null;
  return (
    <Chip size="small" label={r.label} sx={{
      height: 19, fontSize: 10, fontWeight: 800, letterSpacing: 0.2,
      bgcolor: alpha(r.color, 0.12), color: r.color,
      border: `1px solid ${alpha(r.color, 0.28)}`,
      "& .MuiChip-label": { px: 0.9 },
    }} />
  );
}

function RoleChips({ roles }: { roles?: RolesMap }) {
  const active = ROLES.filter(r => roles?.[r.key]);
  if (!active.length) return <Typography sx={{ fontSize: 11, color: TM, fontStyle: "italic" }}>Sin roles</Typography>;
  return (
    <Stack direction="row" gap={0.5} flexWrap="wrap">
      {active.map(r => <RoleBadge key={r.key} roleKey={r.key} />)}
    </Stack>
  );
}

// ── StatPill ──────────────────────────────────────────────────────────────────
function StatPill({ label, value, color, loading }: { label: string; value: number; color: string; loading?: boolean }) {
  return (
    <Paper sx={{
      px: 2, py: 1.25, borderRadius: 2.5,
      bgcolor: S1, border: `1px solid ${BR}`,
      display: "flex", alignItems: "center", gap: 1.5, minWidth: 90,
    }}>
      {loading
        ? <Skeleton width={52} height={26} sx={{ borderRadius: 1 }} />
        : <>
            <Typography sx={{ fontSize: 22, fontWeight: 900, letterSpacing: -1, color, lineHeight: 1 }}>{value}</Typography>
            <Typography sx={{ fontSize: 11, color: TM, fontWeight: 600 }}>{label}</Typography>
          </>
      }
    </Paper>
  );
}

// ── InfoRow (modal view mode) ─────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <Box sx={{
      display: "flex", alignItems: "center", gap: 2, p: 1.75, borderRadius: 2,
      bgcolor: alpha("#fff", 0.025), border: `1px solid ${BR}`,
    }}>
      <Box sx={{ color: TM, flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontSize: 10, color: TM, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</Typography>
        <Typography sx={{ fontSize: 13, color: "#EDEDED", fontWeight: 600, mt: 0.2 }}>{value}</Typography>
      </Box>
    </Box>
  );
}

// ── Mobile UserCard ───────────────────────────────────────────────────────────
function UserCard({ user, onView, onEdit }: { user: UserDTO; onView: () => void; onEdit: () => void }) {
  const activeRoles = ROLES.filter(r => user.roles?.[r.key]);
  const ac = hashColor(user.email);
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Sin nombre";

  return (
    <Paper
      onClick={onView}
      sx={{
        bgcolor: S1, border: `1px solid ${BR}`, borderRadius: 3,
        p: 2, cursor: "pointer", position: "relative", overflow: "hidden",
        transition: "all 0.18s ease",
        "&:hover": {
          border: `1px solid ${alpha(G, 0.35)}`,
          boxShadow: `0 8px 28px rgba(0,0,0,0.5), 0 0 0 1px ${alpha(G, 0.1)}`,
          transform: "translateY(-1px)",
        },
        "&:active": { transform: "translateY(0)" },
      }}
    >
      {user.active && (
        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 2.5, background: `linear-gradient(90deg, ${G}, ${alpha(G, 0)})` }} />
      )}

      <Stack direction="row" gap={1.5} alignItems="flex-start">
        <Avatar sx={{
          width: 50, height: 50, flexShrink: 0, fontWeight: 900, fontSize: 17,
          bgcolor: alpha(ac, 0.14), color: ac,
          border: `2.5px solid ${user.active ? alpha(G, 0.45) : BR}`,
          boxShadow: user.active ? `0 0 14px ${alpha(G, 0.2)}` : "none",
        }}>
          {getInitials(user)}
        </Avatar>

        <Box flex={1} minWidth={0}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.3}>
            <Typography noWrap sx={{ fontWeight: 800, fontSize: 14, color: "#EDEDED", lineHeight: 1.2 }}>
              {fullName}
            </Typography>
            <Box sx={{
              width: 7, height: 7, borderRadius: "50%", flexShrink: 0, ml: 1,
              bgcolor: user.active ? G : "#52525b",
              boxShadow: user.active ? `0 0 7px ${G}` : "none",
            }} />
          </Stack>

          <Typography noWrap sx={{ fontSize: 11.5, color: TM, mb: 0.75, fontFamily: "monospace", letterSpacing: -0.2 }}>
            {user.email}
          </Typography>

          {user.city && (
            <Stack direction="row" alignItems="center" gap={0.4} mb={0.75}>
              <MapPin size={10} color={TM} />
              <Typography sx={{ fontSize: 11, color: TM }}>{user.city}</Typography>
            </Stack>
          )}

          <Stack direction="row" gap={0.5} flexWrap="wrap" mb={1.5}>
            {activeRoles.length > 0
              ? activeRoles.map(r => <RoleBadge key={r.key} roleKey={r.key} />)
              : <Typography sx={{ fontSize: 10, color: TM, fontStyle: "italic" }}>Sin roles</Typography>
            }
          </Stack>

          <Stack direction="row" gap={1} onClick={e => e.stopPropagation()}>
            <Button size="small" startIcon={<Eye size={13} />} onClick={onView} sx={{
              fontSize: 11, fontWeight: 700, borderRadius: 1.5, px: 1.5, py: 0.5, minWidth: 0,
              bgcolor: alpha("#fff", 0.04), color: "#EDEDED", border: `1px solid ${BR}`,
              "&:hover": { bgcolor: alpha(G, 0.1), borderColor: alpha(G, 0.3), color: G },
            }}>Ver</Button>
            <Button size="small" startIcon={<Pencil size={13} />} onClick={onEdit} sx={{
              fontSize: 11, fontWeight: 700, borderRadius: 1.5, px: 1.5, py: 0.5, minWidth: 0,
              bgcolor: alpha(G, 0.08), color: G, border: `1px solid ${alpha(G, 0.22)}`,
              "&:hover": { bgcolor: alpha(G, 0.15), borderColor: G },
            }}>Editar</Button>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

// ── UserDetailModal ───────────────────────────────────────────────────────────
function UserDetailModal({ open, onClose, userId, initialMode = "view", onRefresh }: {
  open: boolean; onClose: () => void; userId: string | null;
  initialMode?: "view" | "edit"; onRefresh: () => void;
}) {
  const [tab,     setTab]     = React.useState(0);
  const [mode,    setMode]    = React.useState<"view"|"edit">(initialMode);
  const [loading, setLoading] = React.useState(false);
  const [saving,  setSaving]  = React.useState(false);
  const [form,    setForm]    = React.useState<Partial<UserDTO>>({});
  const [toast,   setToast]   = React.useState({ open: false, msg: "", sev: "success" as "success"|"error" });

  React.useEffect(() => {
    if (!open || !userId) return;
    setTab(0); setMode(initialMode); setLoading(true);
    getUserById(userId)
      .then(u => setForm(u))
      .catch(e => setToast({ open: true, msg: e?.message || "Error al cargar", sev: "error" }))
      .finally(() => setLoading(false));
  }, [open, userId, initialMode]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateUser(userId, {
        firstName: form.firstName, lastName: form.lastName,
        mobile: form.mobile, city: form.city, address: form.address,
        instagram: form.instagram, facebook: form.facebook, website: form.website,
        roles: form.roles, active: form.active,
      });
      setToast({ open: true, msg: "Usuario actualizado correctamente", sev: "success" });
      setMode("view"); onRefresh();
    } catch (e: any) {
      setToast({ open: true, msg: e?.message || "Error al guardar", sev: "error" });
    } finally { setSaving(false); }
  };

  const toggleRole = (key: keyof RolesMap) =>
    setForm(p => ({ ...p, roles: { ...(p.roles || {}), [key]: !p.roles?.[key] } }));

  const fullName = `${form.firstName || ""} ${form.lastName || ""}`.trim() || "Sin nombre";
  const ac = hashColor(form.email);

  return (
    <>
      <Dialog
        open={open} onClose={onClose} maxWidth="sm" fullWidth
        PaperProps={{ sx: {
          bgcolor: "#0a0a0a", borderRadius: 3, overflow: "hidden",
          border: `1px solid ${BR}`, boxShadow: "0 32px 96px rgba(0,0,0,0.85)",
        }}}
      >
        {/* Green accent top */}
        <Box sx={{ height: 3.5, background: `linear-gradient(90deg, ${G} 0%, ${alpha(G, 0.2)} 100%)`, flexShrink: 0 }} />

        {/* ── Hero header ── */}
        <Box sx={{ p: 3, pb: 2.5, bgcolor: S1, position: "relative" }}>
          {loading ? (
            <Stack direction="row" gap={2} alignItems="center">
              <Skeleton variant="circular" width={72} height={72} sx={{ bgcolor: alpha("#fff", 0.06) }} />
              <Box flex={1}>
                <Skeleton width="55%" height={26} sx={{ bgcolor: alpha("#fff", 0.06) }} />
                <Skeleton width="75%" height={18} sx={{ mt: 0.75, bgcolor: alpha("#fff", 0.04) }} />
              </Box>
            </Stack>
          ) : (
            <Stack direction="row" gap={2.5} alignItems="flex-start">
              {/* Avatar */}
              <Box sx={{ position: "relative", flexShrink: 0 }}>
                <Avatar sx={{
                  width: 72, height: 72, fontWeight: 900, fontSize: 26,
                  bgcolor: alpha(ac, 0.14), color: ac,
                  border: `3px solid ${form.active ? alpha(G, 0.55) : alpha("#fff", 0.1)}`,
                  boxShadow: form.active ? `0 0 24px ${alpha(G, 0.25)}` : "none",
                }}>
                  {getInitials(form)}
                </Avatar>
                {/* Active dot */}
                <Box sx={{
                  position: "absolute", bottom: 3, right: 3,
                  width: 12, height: 12, borderRadius: "50%",
                  bgcolor: form.active ? G : "#52525b",
                  border: `2px solid ${S1}`,
                  boxShadow: form.active ? `0 0 8px ${G}` : "none",
                }} />
              </Box>

              <Box flex={1} minWidth={0}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                  <Box minWidth={0}>
                    <Typography sx={{ fontWeight: 900, fontSize: 20, color: "#EDEDED", letterSpacing: -0.5, lineHeight: 1.1 }}>
                      {fullName}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: TM, mt: 0.4, fontFamily: "monospace" }} noWrap>
                      {form.email}
                    </Typography>
                  </Box>
                  <Stack direction="row" gap={0.75} alignItems="center" flexShrink={0}>
                    <Box sx={{
                      px: 1.25, py: 0.35, borderRadius: 1.25, fontSize: 9.5, fontWeight: 800, letterSpacing: 0.8,
                      bgcolor: form.active ? alpha(G, 0.12) : alpha("#71717a", 0.15),
                      color: form.active ? G : "#71717a",
                      border: `1px solid ${form.active ? alpha(G, 0.3) : alpha("#71717a", 0.3)}`,
                    }}>
                      {form.active ? "ACTIVO" : "INACTIVO"}
                    </Box>
                    <IconButton onClick={onClose} size="small" sx={{ color: TM, "&:hover": { color: "#EDEDED", bgcolor: alpha("#fff", 0.06) } }}>
                      <X size={17} />
                    </IconButton>
                  </Stack>
                </Stack>

                {/* Meta: phone + city */}
                <Stack direction="row" gap={2} mt={1} flexWrap="wrap">
                  {form.mobile && (
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <Phone size={11} color={G} />
                      <Typography sx={{ fontSize: 11.5, color: TM }}>{form.mobile}</Typography>
                    </Stack>
                  )}
                  {form.city && (
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <MapPin size={11} color={G} />
                      <Typography sx={{ fontSize: 11.5, color: TM }}>{form.city}</Typography>
                    </Stack>
                  )}
                </Stack>

                {/* Role badges */}
                <Stack direction="row" gap={0.5} mt={1.25} flexWrap="wrap">
                  <RoleChips roles={form.roles} />
                </Stack>
              </Box>
            </Stack>
          )}
        </Box>

        {/* ── Tabs ── */}
        <Tabs
          value={tab} onChange={(_, v) => setTab(v)}
          sx={{
            bgcolor: S1, borderBottom: `1px solid ${BR}`,
            "& .MuiTabs-indicator": { bgcolor: G, height: 2.5, borderRadius: "2px 2px 0 0" },
            "& .MuiTab-root": { fontSize: 12.5, fontWeight: 700, color: TM, textTransform: "none", minHeight: 44, gap: 0.75 },
            "& .MuiTab-root.Mui-selected": { color: G },
            "& .MuiTab-root .MuiTab-iconWrapper": { margin: 0 },
          }}
        >
          <Tab icon={<UserIcon size={13} />} label="Perfil" iconPosition="start" />
          <Tab icon={<Shield size={13} />} label="Roles" iconPosition="start" />
          <Tab icon={<Clock size={13} />} label="Actividad" iconPosition="start" />
        </Tabs>

        {/* ── Content ── */}
        <DialogContent sx={{ p: 2.5, bgcolor: "#0a0a0a", minHeight: 260 }}>
          {loading ? (
            <Stack spacing={1.5}>
              {[1,2,3].map(i => <Skeleton key={i} height={54} sx={{ borderRadius: 2, bgcolor: alpha("#fff", 0.04) }} />)}
            </Stack>
          ) : (
            <>
              {/* Tab 0 — Perfil */}
              {tab === 0 && (
                mode === "view" ? (
                  <Stack spacing={1.25}>
                    <InfoRow icon={<Mail size={15} />} label="Email" value={form.email} />
                    <InfoRow icon={<Phone size={15} />} label="Teléfono" value={form.mobile} />
                    <InfoRow icon={<MapPin size={15} />} label="Ciudad" value={form.city} />
                    <InfoRow icon={<UserIcon size={15} />} label="Dirección" value={form.address} />
                    <InfoRow icon={<Instagram size={15} />} label="Instagram" value={form.instagram} />
                    <InfoRow icon={<Facebook size={15} />} label="Facebook" value={form.facebook} />
                    <InfoRow icon={<Globe size={15} />} label="Sitio web" value={form.website} />
                    {!form.mobile && !form.city && !form.address && !form.instagram && !form.facebook && !form.website && (
                      <Typography sx={{ color: TM, fontSize: 13, textAlign: "center", py: 3 }}>
                        Sin información de perfil adicional
                      </Typography>
                    )}
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                      <TextField label="Nombre" size="small" fullWidth value={form.firstName ?? ""} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                      <TextField label="Apellido" size="small" fullWidth value={form.lastName ?? ""} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                      <TextField label="Email" size="small" fullWidth value={form.email ?? ""} disabled />
                      <TextField label="Teléfono" size="small" fullWidth value={form.mobile ?? ""} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                      <TextField label="Ciudad" size="small" fullWidth value={form.city ?? ""} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                      <TextField label="Dirección" size="small" fullWidth value={form.address ?? ""} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                      <TextField label="Instagram" size="small" fullWidth value={form.instagram ?? ""} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />
                      <TextField label="Facebook" size="small" fullWidth value={form.facebook ?? ""} onChange={e => setForm(f => ({ ...f, facebook: e.target.value }))} />
                    </Stack>
                    <TextField label="Sitio web" size="small" fullWidth value={form.website ?? ""} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
                  </Stack>
                )
              )}

              {/* Tab 1 — Roles */}
              {tab === 1 && (
                <Stack spacing={1.25}>
                  <Box sx={{ p: 1.75, borderRadius: 2, bgcolor: alpha(G, 0.05), border: `1px solid ${alpha(G, 0.15)}` }}>
                    <Typography sx={{ fontSize: 11.5, color: alpha(G, 0.85), fontWeight: 600, lineHeight: 1.5 }}>
                      Los roles controlan qué funcionalidades puede acceder este usuario.
                    </Typography>
                  </Box>

                  {ROLES.map(r => (
                    <Box
                      key={r.key}
                      onClick={() => mode === "edit" && toggleRole(r.key)}
                      sx={{
                        p: 1.75, borderRadius: 2, display: "flex", alignItems: "center",
                        justifyContent: "space-between", gap: 1.5,
                        border: `1px solid ${form.roles?.[r.key] ? alpha(r.color, 0.35) : BR}`,
                        bgcolor: form.roles?.[r.key] ? alpha(r.color, 0.06) : alpha("#fff", 0.02),
                        cursor: mode === "edit" ? "pointer" : "default",
                        transition: "all 0.15s ease",
                        "&:hover": mode === "edit" ? { border: `1px solid ${alpha(r.color, 0.5)}`, bgcolor: alpha(r.color, 0.08) } : {},
                      }}
                    >
                      <Stack direction="row" gap={1.5} alignItems="center">
                        <Box sx={{
                          width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                          bgcolor: form.roles?.[r.key] ? r.color : "#3f3f46",
                          boxShadow: form.roles?.[r.key] ? `0 0 8px ${r.color}` : "none",
                          transition: "all 0.15s",
                        }} />
                        <Box>
                          <Typography sx={{ fontWeight: 800, fontSize: 13, color: form.roles?.[r.key] ? r.color : "#EDEDED", lineHeight: 1 }}>
                            {r.label}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: TM, mt: 0.2 }}>{r.desc}</Typography>
                        </Box>
                      </Stack>
                      {mode === "edit" && (
                        <Switch
                          checked={Boolean(form.roles?.[r.key])}
                          onChange={() => toggleRole(r.key)}
                          onClick={e => e.stopPropagation()}
                          size="small"
                          sx={{
                            flexShrink: 0,
                            "& .MuiSwitch-thumb": { bgcolor: form.roles?.[r.key] ? r.color : "#52525b", width: 14, height: 14 },
                            "& .MuiSwitch-track": { bgcolor: form.roles?.[r.key] ? alpha(r.color, 0.35) : "rgba(255,255,255,0.1)" },
                            "& .MuiSwitch-switchBase.Mui-checked": { transform: "translateX(14px)" },
                          }}
                        />
                      )}
                    </Box>
                  ))}

                  <Divider sx={{ borderColor: BR }} />

                  <Box
                    onClick={() => mode === "edit" && setForm(f => ({ ...f, active: !f.active }))}
                    sx={{
                      p: 1.75, borderRadius: 2, display: "flex", alignItems: "center",
                      justifyContent: "space-between", gap: 1.5,
                      border: `1px solid ${form.active ? alpha(G, 0.35) : BR}`,
                      bgcolor: form.active ? alpha(G, 0.06) : alpha("#ef4444", 0.04),
                      cursor: mode === "edit" ? "pointer" : "default",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: 13, color: form.active ? G : "#ef4444", lineHeight: 1 }}>
                        Cuenta activa
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: TM, mt: 0.25 }}>
                        {form.active ? "El usuario puede iniciar sesión" : "Acceso al sistema bloqueado"}
                      </Typography>
                    </Box>
                    {mode === "edit" && (
                      <Switch
                        checked={Boolean(form.active)}
                        onChange={() => setForm(f => ({ ...f, active: !f.active }))}
                        onClick={e => e.stopPropagation()}
                        size="small"
                        sx={{
                          flexShrink: 0,
                          "& .MuiSwitch-thumb": { bgcolor: form.active ? G : "#ef4444", width: 14, height: 14 },
                          "& .MuiSwitch-track": { bgcolor: form.active ? alpha(G, 0.35) : alpha("#ef4444", 0.3) },
                          "& .MuiSwitch-switchBase.Mui-checked": { transform: "translateX(14px)" },
                        }}
                      />
                    )}
                  </Box>
                </Stack>
              )}

              {/* Tab 2 — Actividad */}
              {tab === 2 && (
                <Stack spacing={1.25}>
                  <InfoRow icon={<Clock size={15} />}    label="Último acceso"  value={fmtDate(form.lastLoginAt, true)} />
                  <InfoRow icon={<Calendar size={15} />} label="Registrado"     value={fmtDate(form.registeredAt)} />
                  <InfoRow icon={<Calendar size={15} />} label="Creado"         value={fmtDate(form.createdAt, true)} />
                  <InfoRow icon={<Calendar size={15} />} label="Actualizado"    value={fmtDate(form.updatedAt, true)} />
                </Stack>
              )}
            </>
          )}
        </DialogContent>

        {/* ── Footer actions ── */}
        <DialogActions sx={{ p: 2, bgcolor: S1, borderTop: `1px solid ${BR}`, gap: 1 }}>
          {mode === "view" ? (
            <>
              <Button
                startIcon={<Pencil size={15} />}
                onClick={() => setMode("edit")}
                sx={{
                  bgcolor: alpha(G, 0.1), color: G, fontWeight: 700, fontSize: 13,
                  border: `1px solid ${alpha(G, 0.25)}`, borderRadius: 2,
                  "&:hover": { bgcolor: alpha(G, 0.18), borderColor: G },
                }}
              >
                Editar usuario
              </Button>
              <Box flex={1} />
              <Button onClick={onClose} sx={{ color: TM, fontWeight: 600, fontSize: 13, borderRadius: 2 }}>Cerrar</Button>
            </>
          ) : (
            <>
              <Button
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save size={15} />}
                onClick={handleSave}
                disabled={saving}
                sx={{
                  bgcolor: G, color: "#000", fontWeight: 800, fontSize: 13, borderRadius: 2,
                  "&:hover": { bgcolor: GD }, "&:disabled": { bgcolor: alpha(G, 0.3), color: alpha("#000", 0.4) },
                  px: 2.5,
                }}
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
              <Box flex={1} />
              <Button onClick={() => setMode("view")} sx={{ color: TM, fontWeight: 600, fontSize: 13, borderRadius: 2 }}>
                Cancelar
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast(t => ({ ...t, open: false }))}>
        <Alert severity={toast.sev} variant="filled">{toast.msg}</Alert>
      </Snackbar>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Filters
  const [q,          setQ]          = React.useState("");
  const [city,       setCity]       = React.useState("");
  const [roles,      setRoles]      = React.useState<string[]>([]);
  const [active,     setActive]     = React.useState<string>("");
  const [sortBy,     setSortBy]     = React.useState("createdAt");
  const [sortDir,    setSortDir]    = React.useState<"asc"|"desc">("desc");
  const [pagination, setPagination] = React.useState<GridPaginationModel>({ page: 0, pageSize: 20 });

  const debouncedQ    = useDebouncedValue(q, 350);
  const debouncedCity = useDebouncedValue(city, 350);

  const params: UsersSearchParams = {
    q:      debouncedQ    || undefined,
    city:   debouncedCity || undefined,
    roles:  roles.length  ? (roles as any) : undefined,
    active: active === "" ? undefined : active === "true",
    page:   pagination.page + 1,
    limit:  pagination.pageSize,
    sortBy, sortDir,
    fields: ["email","firstName","lastName","city","mobile","roles","active","createdAt","lastLoginAt","registeredAt","updatedAt"],
  };

  const { data, isLoading, isFetching, refetch } = useUsers(params);
  const { data: cities = [] } = useCities();

  // Modal
  const [modalOpen,     setModalOpen]     = React.useState(false);
  const [modalUserId,   setModalUserId]   = React.useState<string | null>(null);
  const [modalInitMode, setModalInitMode] = React.useState<"view"|"edit">("view");

  const openModal = (id: string, mode: "view"|"edit" = "view") => {
    setModalUserId(id); setModalInitMode(mode); setModalOpen(true);
  };

  const rows = React.useMemo(
    () => (data?.users ?? []).map(u => ({ ...u, id: u.id ?? (u as any)._id })),
    [data?.users]
  );

  const activeCount = rows.filter(u => u.active).length;

  // City options from API (active only)
  const cityOptions = React.useMemo(
    () => cities.filter(c => c.active).map(c => c.name).sort(),
    [cities]
  );

  // Desktop columns
  const columns: any = React.useMemo<GridColDef<UserDTO>[]>(() => [
    {
      field: "name", headerName: "Usuario", flex: 1, minWidth: 220,
      renderCell: (p: GridRenderCellParams<UserDTO>) => {
        const u = p.row;
        const full = `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Sin nombre";
        const ac = hashColor(u.email);
        return (
          <Stack direction="row" alignItems="center" gap={1.5} height="100%">
            <Avatar sx={{
              width: 34, height: 34, flexShrink: 0, fontSize: 12, fontWeight: 900,
              bgcolor: alpha(ac, 0.14), color: ac,
              border: `2px solid ${u.active ? alpha(G, 0.45) : BR}`,
            }}>
              {getInitials(u)}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", lineHeight: 1.2 }}>{full}</Typography>
              <Typography sx={{ fontSize: 11, color: "text.disabled", fontFamily: "monospace" }}>{u.email}</Typography>
            </Box>
          </Stack>
        );
      },
    },
    {
      field: "city", headerName: "Ciudad", width: 140,
      renderCell: (p: GridRenderCellParams<UserDTO>) => p.row.city
        ? <Stack direction="row" alignItems="center" gap={0.75} height="100%"><MapPin size={11} color={TM} /><Typography sx={{ fontSize: 12, color: "text.secondary" }}>{p.row.city}</Typography></Stack>
        : <Typography sx={{ fontSize: 12, color: "text.disabled" }}>—</Typography>,
    },
    {
      field: "mobile", headerName: "Teléfono", width: 140,
      renderCell: (p: GridRenderCellParams<UserDTO>) => p.row.mobile
        ? <Typography sx={{ fontSize: 12, color: "text.secondary", fontFamily: "monospace" }}>{p.row.mobile}</Typography>
        : <Typography sx={{ fontSize: 12, color: "text.disabled" }}>—</Typography>,
    },
    {
      field: "roles", headerName: "Roles", flex: 1, minWidth: 190, sortable: false,
      renderCell: (p: GridRenderCellParams<UserDTO>) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <RoleChips roles={p.row.roles} />
        </Box>
      ),
    },
    {
      field: "active", headerName: "Estado", width: 110,
      renderCell: (p: GridRenderCellParams<UserDTO>) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Chip
            size="small"
            icon={p.row.active
              ? <CheckCircle2 size={11} style={{ marginLeft: 6 }} />
              : <XCircle size={11} style={{ marginLeft: 6 }} />
            }
            label={p.row.active ? "Activo" : "Inactivo"}
            sx={{
              fontSize: 10.5, fontWeight: 800,
              bgcolor: p.row.active ? alpha(G, 0.1) : alpha("#71717a", 0.1),
              color:   p.row.active ? G : "#71717a",
              border: `1px solid ${p.row.active ? alpha(G, 0.25) : alpha("#71717a", 0.25)}`,
              "& .MuiChip-icon": { color: "inherit" },
            }}
          />
        </Box>
      ),
    },
    {
      field: "actions", headerName: "", width: 96, sortable: false,
      renderCell: (p: GridRenderCellParams<UserDTO>) => {
        const id = p.row.id || (p.row as any)._id;
        return (
          <Stack direction="row" gap={0.5} alignItems="center" height="100%">
            <Tooltip title="Ver detalle">
              <IconButton size="small" onClick={() => openModal(id, "view")} sx={{ color: TM, "&:hover": { color: G, bgcolor: alpha(G, 0.08) } }}>
                <Eye size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => openModal(id, "edit")} sx={{ color: TM, "&:hover": { color: G, bgcolor: alpha(G, 0.08) } }}>
                <Pencil size={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
    },
  ], []);

  return (
    <Box sx={{ pb: 4 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="flex-end" justifyContent="space-between" mb={3}>
        <Box>
          <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: G, textTransform: "uppercase", mb: 0.5 }}>
            Administración
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.5, color: "text.primary", lineHeight: 1 }}>
            Usuarios
          </Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.75 }}>
            Gestión de cuentas, roles y permisos del sistema
          </Typography>
        </Box>
        <Tooltip title="Actualizar">
          <IconButton onClick={() => refetch()} sx={{
            bgcolor: alpha("#fff", 0.04), border: `1px solid ${BR}`,
            "&:hover": { bgcolor: alpha(G, 0.08), borderColor: alpha(G, 0.3), color: G },
          }}>
            <RefreshCcw size={18} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <Stack direction="row" gap={1.5} mb={3} flexWrap="wrap">
        <StatPill label="Total"       value={data?.total ?? 0} color="#a78bfa" loading={isLoading} />
        <StatPill label="Esta página" value={rows.length}      color="#60a5fa" loading={isLoading} />
        <StatPill label="Activos"     value={activeCount}      color={G}       loading={isLoading} />
      </Stack>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <Paper sx={{
        p: 2, mb: 2, borderRadius: 3,
        bgcolor: S1, border: `1px solid ${BR}`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}>
        <Stack direction={{ xs: "column", sm: "row" }} gap={1.25} flexWrap="wrap" alignItems="center">

          {/* Search */}
          <TextField
            size="small"
            placeholder="Buscar nombre, email o móvil…"
            value={q}
            onChange={e => { setQ(e.target.value); setPagination(p => ({ ...p, page: 0 })); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={15} /></InputAdornment> }}
            sx={{
              flex: "1 1 240px", minWidth: 200,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2, bgcolor: alpha("#fff", 0.03), fontSize: 13,
                "& fieldset": { borderColor: BR },
                "&:hover fieldset": { borderColor: alpha("#fff", 0.15) },
                "&.Mui-focused fieldset": { borderColor: G },
              },
            }}
          />

          {/* City — populated from API */}
          <FormControl size="small" sx={{ flex: "0 1 170px", minWidth: 140 }}>
            <InputLabel sx={{ fontSize: 13 }}>Ciudad</InputLabel>
            <Select
              value={city}
              label="Ciudad"
              onChange={e => { setCity(e.target.value); setPagination(p => ({ ...p, page: 0 })); }}
              sx={{
                borderRadius: 2, fontSize: 13,
                "& fieldset": { borderColor: BR },
                "&:hover fieldset": { borderColor: alpha("#fff", 0.15) },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: G },
              }}
            >
              <MenuItem value="" sx={{ fontSize: 13, fontStyle: "italic", color: TM }}>Todas</MenuItem>
              {cityOptions.map(name => (
                <MenuItem key={name} value={name} sx={{ fontSize: 13 }}>{name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Roles multi */}
          <FormControl size="small" sx={{ flex: "0 1 200px", minWidth: 150 }}>
            <InputLabel sx={{ fontSize: 13 }}>Roles</InputLabel>
            <Select
              multiple value={roles} label="Roles"
              onChange={e => { setRoles(e.target.value as string[]); setPagination(p => ({ ...p, page: 0 })); }}
              renderValue={selected => (
                <Stack direction="row" gap={0.5} flexWrap="wrap">
                  {(selected as string[]).map(r => <RoleBadge key={r} roleKey={r as keyof RolesMap} />)}
                </Stack>
              )}
              sx={{
                borderRadius: 2, fontSize: 13,
                "& fieldset": { borderColor: BR },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: G },
              }}
            >
              {ROLES.map(r => (
                <MenuItem key={r.key} value={r.key}>
                  <Stack direction="row" alignItems="center" gap={1.25}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: r.color, flexShrink: 0 }} />
                    <Typography fontSize={13}>{r.label}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Active */}
          <FormControl size="small" sx={{ flex: "0 1 130px", minWidth: 110 }}>
            <InputLabel sx={{ fontSize: 13 }}>Estado</InputLabel>
            <Select
              value={active} label="Estado"
              onChange={e => { setActive(e.target.value); setPagination(p => ({ ...p, page: 0 })); }}
              sx={{ borderRadius: 2, fontSize: 13, "& fieldset": { borderColor: BR }, "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: G } }}
            >
              <MenuItem value="" sx={{ fontSize: 13 }}><em>Todos</em></MenuItem>
              <MenuItem value="true"  sx={{ fontSize: 13 }}>Activo</MenuItem>
              <MenuItem value="false" sx={{ fontSize: 13 }}>Inactivo</MenuItem>
            </Select>
          </FormControl>

          {/* Sort */}
          <FormControl size="small" sx={{ flex: "0 1 160px", minWidth: 130 }}>
            <InputLabel sx={{ fontSize: 13 }}>Ordenar</InputLabel>
            <Select
              value={sortBy} label="Ordenar"
              onChange={e => setSortBy(String(e.target.value))}
              sx={{ borderRadius: 2, fontSize: 13, "& fieldset": { borderColor: BR }, "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: G } }}
            >
              <MenuItem value="createdAt"   sx={{ fontSize: 13 }}>Creado</MenuItem>
              <MenuItem value="firstName"   sx={{ fontSize: 13 }}>Nombre</MenuItem>
              <MenuItem value="email"       sx={{ fontSize: 13 }}>Email</MenuItem>
              <MenuItem value="city"        sx={{ fontSize: 13 }}>Ciudad</MenuItem>
              <MenuItem value="lastLoginAt" sx={{ fontSize: 13 }}>Último login</MenuItem>
            </Select>
          </FormControl>

          {/* Asc / Desc pill */}
          <Button
            size="small"
            onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
            sx={{
              px: 1.75, fontWeight: 700, fontSize: 12, borderRadius: 2, flexShrink: 0,
              bgcolor: alpha("#fff", 0.04), color: "#EDEDED", border: `1px solid ${BR}`,
              "&:hover": { bgcolor: alpha(G, 0.1), borderColor: alpha(G, 0.3), color: G },
            }}
          >
            {sortDir === "desc" ? "↓ Desc" : "↑ Asc"}
          </Button>
        </Stack>
      </Paper>

      {/* Progress bar */}
      {isFetching && (
        <LinearProgress sx={{ mb: 1.5, borderRadius: 1, height: 2, "& .MuiLinearProgress-bar": { bgcolor: G } }} />
      )}

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {isMobile ? (
        /* Mobile card list */
        <Stack spacing={1.5}>
          {isLoading
            ? [1,2,3,4,5].map(i => (
                <Paper key={i} sx={{ p: 2, borderRadius: 3, bgcolor: S1, border: `1px solid ${BR}` }}>
                  <Stack direction="row" gap={1.5} alignItems="center">
                    <Skeleton variant="circular" width={50} height={50} sx={{ bgcolor: alpha("#fff", 0.05) }} />
                    <Box flex={1}>
                      <Skeleton width="55%" height={18} sx={{ bgcolor: alpha("#fff", 0.05) }} />
                      <Skeleton width="80%" height={14} sx={{ mt: 0.5, bgcolor: alpha("#fff", 0.03) }} />
                    </Box>
                  </Stack>
                </Paper>
              ))
            : rows.length === 0
              ? (
                <Paper sx={{ p: 6, borderRadius: 3, bgcolor: S1, border: `1px solid ${BR}`, textAlign: "center" }}>
                  <Users size={44} color={alpha("#fff", 0.12)} style={{ marginBottom: 12 }} />
                  <Typography sx={{ color: TM, fontWeight: 700, fontSize: 15 }}>Sin resultados</Typography>
                  <Typography sx={{ color: TM, fontSize: 12, mt: 0.5 }}>Intenta ajustar los filtros de búsqueda</Typography>
                </Paper>
              )
              : rows.map(u => (
                  <UserCard
                    key={u.id}
                    user={u as UserDTO}
                    onView={() => openModal(u.id, "view")}
                    onEdit={() => openModal(u.id, "edit")}
                  />
                ))
          }

          {!isLoading && rows.length > 0 && (
            <Stack direction="row" justifyContent="space-between" alignItems="center" pt={0.5}>
              <Typography sx={{ fontSize: 12, color: TM }}>
                {rows.length} de {data?.total ?? 0} usuarios
              </Typography>
              <Stack direction="row" gap={1}>
                <Button size="small"
                  disabled={pagination.page === 0}
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  sx={{ fontSize: 11, borderRadius: 2, border: `1px solid ${BR}`, color: "#EDEDED", minWidth: 90,
                    "&:hover": { borderColor: alpha(G, 0.3), color: G }, "&:disabled": { opacity: 0.35 },
                  }}
                >← Anterior</Button>
                <Button size="small"
                  disabled={!data?.total || (pagination.page + 1) * pagination.pageSize >= data.total}
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  sx={{ fontSize: 11, borderRadius: 2, border: `1px solid ${BR}`, color: "#EDEDED", minWidth: 90,
                    "&:hover": { borderColor: alpha(G, 0.3), color: G }, "&:disabled": { opacity: 0.35 },
                  }}
                >Siguiente →</Button>
              </Stack>
            </Stack>
          )}
        </Stack>
      ) : (
        /* Desktop DataGrid */
        <Paper sx={{
          borderRadius: 3, overflow: "hidden",
          bgcolor: S1, border: `1px solid ${BR}`,
          boxShadow: "0 4px 28px rgba(0,0,0,0.45)",
        }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={r => r.id || (r as any)._id}
            rowCount={data?.total ?? 0}
            paginationMode="server"
            paginationModel={pagination}
            onPaginationModelChange={setPagination}
            pageSizeOptions={[10, 20, 50, 100]}
            loading={isLoading}
            disableRowSelectionOnClick
            disableColumnMenu
            rowHeight={58}
            sx={{
              border: "none",
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "rgba(255,255,255,0.02)",
                borderBottom: `1px solid ${BR}`, borderRadius: 0,
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
                textTransform: "uppercase", color: "text.secondary",
              },
              "& .MuiDataGrid-row": {
                "&:hover": { bgcolor: "rgba(255,255,255,0.025)" },
                "&.Mui-selected": { bgcolor: alpha(G, 0.05) },
              },
              "& .MuiDataGrid-cell": { borderBottom: `1px solid ${BR}` },
              "& .MuiDataGrid-footerContainer": { borderTop: `1px solid ${BR}` },
              "& .MuiDataGrid-virtualScroller": { minHeight: 260 },
            }}
          />
        </Paper>
      )}

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      <UserDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={modalUserId}
        initialMode={modalInitMode}
        onRefresh={refetch}
      />
    </Box>
  );
}
