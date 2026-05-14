/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import {
  Box, Stack, Typography, TextField, Button, Paper, Skeleton,
  Avatar, Tooltip, Snackbar, Alert, CircularProgress, Chip,
  Select, MenuItem, FormControl, InputLabel, Divider, alpha,
  InputAdornment, IconButton,
} from "@mui/material";
import {
  Save, Camera, X, User, Phone, MapPin, Instagram, Facebook,
  Globe, FileText, Clock, Calendar, CheckCircle2, XCircle,
  Shield, Mail, Link as LinkIcon, Eye, EyeOff,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/provider/authProvider";
import { getUserById, updateUser, type UserDTO, type Roles as RolesMap } from "@services/user.service";

// ── Design tokens ─────────────────────────────────────────────────────────────
const G   = "#22c55e";
const GD  = "#16a34a";
const S1  = "#111113";
const S2  = "#18181b";
const BR  = "rgba(255,255,255,0.07)";
const TM  = "rgba(255,255,255,0.38)";

// ── Role config ───────────────────────────────────────────────────────────────
const ROLES: { key: keyof RolesMap; label: string; color: string }[] = [
  { key: "superuser", label: "Superuser", color: "#ef4444" },
  { key: "staff",     label: "Staff",     color: "#a78bfa" },
  { key: "curador",   label: "Curador",   color: "#60a5fa" },
  { key: "cajero",    label: "Cajero",    color: "#f59e0b" },
  { key: "artista",   label: "Artista",   color: G         },
];

const DOC_TYPES = ["CC", "NIT", "CE", "PP", "OTRO", "INE"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(u: Partial<UserDTO>) {
  const f = u.firstName?.[0] || "";
  const l = u.lastName?.[0] || "";
  return (f + l).toUpperCase() || (u.email?.[0] || "?").toUpperCase();
}

function hashColor(str = "") {
  const p = [G, "#60a5fa", "#a78bfa", "#f59e0b", "#f472b6", "#34d399"];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % p.length;
  return p[h];
}

function fmtDate(s?: string | null, withTime = false) {
  if (!s) return null;
  return new Date(s).toLocaleDateString("es-CO", {
    year: "numeric", month: "long", day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

// ── Section card ──────────────────────────────────────────────────────────────
function Section({
  icon, title, subtitle, children,
}: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Paper sx={{
      bgcolor: S1, border: `1px solid ${BR}`, borderRadius: 3,
      overflow: "hidden",
    }}>
      <Box sx={{ px: 3, py: 2.25, borderBottom: `1px solid ${BR}`, display: "flex", gap: 1.5, alignItems: "center" }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: 2,
          bgcolor: alpha(G, 0.1), color: G,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {icon}
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 14, color: "#EDEDED", lineHeight: 1.1 }}>{title}</Typography>
          {subtitle && <Typography sx={{ fontSize: 11.5, color: TM, mt: 0.1 }}>{subtitle}</Typography>}
        </Box>
      </Box>
      <Box sx={{ p: 3 }}>{children}</Box>
    </Paper>
  );
}

// ── Activity row ──────────────────────────────────────────────────────────────
function ActivityRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <Stack direction="row" alignItems="center" gap={2} sx={{
      p: 1.75, borderRadius: 2,
      bgcolor: alpha("#fff", 0.02), border: `1px solid ${BR}`,
    }}>
      <Box sx={{ color: TM, flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontSize: 10.5, color: TM, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Typography>
        <Typography sx={{ fontSize: 13, color: value ? "#EDEDED" : TM, fontWeight: 600, mt: 0.1, fontStyle: value ? "normal" : "italic" }}>
          {value || "—"}
        </Typography>
      </Box>
    </Stack>
  );
}

// ── Styled text field ─────────────────────────────────────────────────────────
function FField({ label, value, onChange, disabled, placeholder, type, multiline, rows, startIcon }: {
  label: string; value: string; onChange?: (v: string) => void;
  disabled?: boolean; placeholder?: string; type?: string;
  multiline?: boolean; rows?: number; startIcon?: React.ReactNode;
}) {
  return (
    <TextField
      fullWidth size="small" label={label} value={value} type={type}
      placeholder={placeholder} multiline={multiline} rows={rows}
      onChange={e => onChange?.(e.target.value)}
      disabled={disabled}
      InputProps={startIcon ? {
        startAdornment: <InputAdornment position="start" sx={{ color: TM }}>{startIcon}</InputAdornment>,
      } : undefined}
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: 2, bgcolor: alpha("#fff", 0.025), fontSize: 13,
          "& fieldset": { borderColor: BR },
          "&:hover fieldset": { borderColor: alpha("#fff", 0.18) },
          "&.Mui-focused fieldset": { borderColor: G },
          "&.Mui-disabled": { bgcolor: alpha("#fff", 0.01) },
          "&.Mui-disabled fieldset": { borderColor: alpha("#fff", 0.04) },
        },
        "& .MuiInputLabel-root": { fontSize: 13 },
        "& .MuiInputLabel-root.Mui-focused": { color: G },
        "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: TM },
      }}
    />
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AccountPage() {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();

  const [profile,  setProfile]  = React.useState<Partial<UserDTO & { profilePhotoUrl?: string }>>({});
  const [loading,  setLoading]  = React.useState(true);
  const [saving,   setSaving]   = React.useState(false);
  const [toast,    setToast]    = React.useState({ open: false, msg: "", sev: "success" as "success" | "error" });
  const [photoEdit, setPhotoEdit] = React.useState(false);
  const [photoInput, setPhotoInput] = React.useState("");
  const [imgError,  setImgError]  = React.useState(false);

  // Load full profile
  React.useEffect(() => {
    if (!authUser?.id) return;
    setLoading(true);
    getUserById(authUser.id)
      .then(u => {
        setProfile(u as any);
        setPhotoInput((u as any).profilePhotoUrl || "");
      })
      .catch(() => setToast({ open: true, msg: t("account.loadError"), sev: "error" }))
      .finally(() => setLoading(false));
  }, [authUser?.id, t]);

  const set = (key: string) => (val: string) =>
    setProfile(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!authUser?.id) return;
    setSaving(true);
    try {
      await updateUser(authUser.id, {
        firstName:      profile.firstName,
        lastName:       profile.lastName,
        mobile:         profile.mobile,
        city:           profile.city,
        address:        profile.address,
        instagram:      profile.instagram,
        facebook:       profile.facebook,
        website:        profile.website,
        documentType:   profile.documentType as any,
        documentNumber: profile.documentNumber,
        ...(photoInput !== ((profile as any).profilePhotoUrl || "")
          ? { profilePhotoUrl: photoInput || null }
          : {}),
      } as any);
      setProfile(p => ({ ...p, profilePhotoUrl: photoInput || undefined } as any));
      setPhotoEdit(false);
      setToast({ open: true, msg: t("account.saved"), sev: "success" });
    } catch (e: any) {
      setToast({ open: true, msg: e?.message || t("account.saveError"), sev: "error" });
    } finally { setSaving(false); }
  };

  const activeRoles  = ROLES.filter(r => profile.roles?.[r.key]);
  const photoUrl     = (profile as any).profilePhotoUrl || photoInput || null;
  const ac           = hashColor(profile.email);
  const fullName     = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();

  const SkRow = () => (
    <Stack spacing={1.5}>
      {[1,2].map(i => <Skeleton key={i} height={48} sx={{ borderRadius: 2, bgcolor: alpha("#fff", 0.04) }} />)}
    </Stack>
  );

  return (
    <Box sx={{ pb: 6 }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: G, textTransform: "uppercase", mb: 0.5 }}>
          {t("navigation.account")}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.5, color: "text.primary", lineHeight: 1 }}>
          {t("account.title")}
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.75 }}>
          {t("account.subtitle")}
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", lg: "row" }} gap={3} alignItems="flex-start">

        {/* ── LEFT: Profile card ───────────────────────────────────────── */}
        <Box sx={{ width: { xs: "100%", lg: 300 }, flexShrink: 0, position: { lg: "sticky" }, top: { lg: 24 } }}>
          <Paper sx={{
            bgcolor: S1, border: `1px solid ${BR}`, borderRadius: 3, overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}>
            {/* Green top accent */}
            <Box sx={{ height: 3, background: `linear-gradient(90deg, ${G}, ${alpha(G, 0.1)})` }} />

            <Box sx={{ p: 3 }}>
              {loading ? (
                <Stack alignItems="center" gap={2}>
                  <Skeleton variant="circular" width={96} height={96} sx={{ bgcolor: alpha("#fff", 0.06) }} />
                  <Skeleton width={140} height={22} sx={{ bgcolor: alpha("#fff", 0.05) }} />
                  <Skeleton width={180} height={16} sx={{ bgcolor: alpha("#fff", 0.04) }} />
                </Stack>
              ) : (
                <>
                  {/* Avatar with photo-edit overlay */}
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 2.5 }}>
                    <Box
                      sx={{ position: "relative", cursor: "pointer", mb: 1.5 }}
                      onClick={() => setPhotoEdit(v => !v)}
                    >
                      <Avatar
                        src={!imgError && photoUrl ? photoUrl : undefined}
                        onError={() => setImgError(true)}
                        sx={{
                          width: 96, height: 96, fontWeight: 900, fontSize: 34,
                          bgcolor: alpha(ac, 0.14), color: ac,
                          border: `3px solid ${profile.active ? alpha(G, 0.5) : BR}`,
                          boxShadow: profile.active ? `0 0 24px ${alpha(G, 0.2)}` : "none",
                          transition: "all 0.2s",
                        }}
                      >
                        {getInitials(profile)}
                      </Avatar>

                      {/* Hover overlay */}
                      <Box sx={{
                        position: "absolute", inset: 0, borderRadius: "50%",
                        bgcolor: "rgba(0,0,0,0.55)",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        opacity: 0, transition: "opacity 0.2s",
                        "&:hover": { opacity: 1 },
                      }}>
                        <Camera size={22} color="#fff" />
                        <Typography sx={{ fontSize: 9, color: "#fff", fontWeight: 700, mt: 0.3, letterSpacing: 0.3 }}>
                          {t("account.changePhoto")}
                        </Typography>
                      </Box>

                      {/* Active dot */}
                      <Box sx={{
                        position: "absolute", bottom: 4, right: 4,
                        width: 14, height: 14, borderRadius: "50%",
                        bgcolor: profile.active ? G : "#52525b",
                        border: `2.5px solid ${S1}`,
                        boxShadow: profile.active ? `0 0 8px ${G}` : "none",
                      }} />
                    </Box>

                    {/* Photo URL input (expandable) */}
                    {photoEdit && (
                      <Box sx={{ width: "100%", mt: 0.5 }}>
                        <TextField
                          fullWidth size="small"
                          label={t("account.photoUrlLabel")}
                          placeholder={t("account.photoUrlPlaceholder")}
                          value={photoInput}
                          onChange={e => { setPhotoInput(e.target.value); setImgError(false); }}
                          InputProps={{
                            startAdornment: <InputAdornment position="start" sx={{ color: TM }}><LinkIcon size={13} /></InputAdornment>,
                            endAdornment: photoInput ? (
                              <InputAdornment position="end">
                                <IconButton size="small" onClick={() => { setPhotoInput(""); setImgError(false); }} sx={{ color: TM }}>
                                  <X size={13} />
                                </IconButton>
                              </InputAdornment>
                            ) : null,
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 2, bgcolor: alpha("#fff", 0.03), fontSize: 12,
                              "& fieldset": { borderColor: BR },
                              "&.Mui-focused fieldset": { borderColor: G },
                            },
                            "& .MuiInputLabel-root.Mui-focused": { color: G },
                            "& .MuiInputLabel-root": { fontSize: 12 },
                          }}
                        />
                        {imgError && photoInput && (
                          <Typography sx={{ fontSize: 10.5, color: "#ef4444", mt: 0.5, pl: 0.5 }}>
                            No se pudo cargar la imagen
                          </Typography>
                        )}
                      </Box>
                    )}

                    {/* Name & email */}
                    <Typography sx={{ fontWeight: 900, fontSize: 17, color: "#EDEDED", letterSpacing: -0.3, mt: 1, textAlign: "center", lineHeight: 1.2 }}>
                      {fullName || t("account.firstName")}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: TM, mt: 0.4, textAlign: "center", fontFamily: "monospace" }}>
                      {profile.email}
                    </Typography>
                  </Box>

                  {/* Status chip */}
                  <Box sx={{ display: "flex", justifyContent: "center", mb: 2.5 }}>
                    <Chip
                      size="small"
                      icon={profile.active
                        ? <CheckCircle2 size={11} style={{ marginLeft: 6 }} />
                        : <XCircle size={11} style={{ marginLeft: 6 }} />
                      }
                      label={profile.active ? t("account.active") : t("account.inactive")}
                      sx={{
                        fontWeight: 800, fontSize: 10.5, letterSpacing: 0.2,
                        bgcolor: profile.active ? alpha(G, 0.12) : alpha("#71717a", 0.15),
                        color:   profile.active ? G : "#71717a",
                        border: `1px solid ${profile.active ? alpha(G, 0.3) : alpha("#71717a", 0.3)}`,
                        "& .MuiChip-icon": { color: "inherit" },
                      }}
                    />
                  </Box>

                  <Divider sx={{ borderColor: BR, mb: 2.5 }} />

                  {/* Roles */}
                  <Box>
                    <Stack direction="row" alignItems="center" gap={0.75} mb={1.25}>
                      <Shield size={12} color={TM} />
                      <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: TM, textTransform: "uppercase", letterSpacing: 0.8 }}>
                        {t("account.roles")}
                      </Typography>
                    </Stack>
                    {activeRoles.length > 0 ? (
                      <Stack gap={0.75}>
                        {activeRoles.map(r => (
                          <Box key={r.key} sx={{
                            display: "flex", alignItems: "center", gap: 1.25, px: 1.5, py: 0.9,
                            borderRadius: 1.75, bgcolor: alpha(r.color, 0.08),
                            border: `1px solid ${alpha(r.color, 0.2)}`,
                          }}>
                            <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: r.color, boxShadow: `0 0 6px ${r.color}`, flexShrink: 0 }} />
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.label}</Typography>
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Typography sx={{ fontSize: 12, color: TM, fontStyle: "italic", pl: 0.5 }}>
                        {t("account.noRoles")}
                      </Typography>
                    )}
                  </Box>
                </>
              )}
            </Box>
          </Paper>
        </Box>

        {/* ── RIGHT: Form sections ─────────────────────────────────────── */}
        <Stack flex={1} spacing={2.5} sx={{ minWidth: 0 }}>

          {/* Personal info */}
          <Section icon={<User size={16} />} title={t("account.personalInfo")} subtitle={t("account.personalInfoSub")}>
            {loading ? <SkRow /> : (
              <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                <FField label={t("account.firstName")} value={profile.firstName || ""} onChange={set("firstName")} />
                <FField label={t("account.lastName")}  value={profile.lastName  || ""} onChange={set("lastName")} />
              </Stack>
            )}
          </Section>

          {/* Email (read-only) */}
          <Section icon={<Mail size={16} />} title={t("auth.email")} subtitle={t("account.emailReadOnly")}>
            {loading ? <SkRow /> : (
              <FField
                label={t("auth.email")} value={profile.email || ""} disabled
                startIcon={<Mail size={14} />}
              />
            )}
          </Section>

          {/* Contact */}
          <Section icon={<Phone size={16} />} title={t("account.contactInfo")} subtitle={t("account.contactInfoSub")}>
            {loading ? <SkRow /> : (
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                  <FField label={t("account.phone")} value={profile.mobile || ""} onChange={set("mobile")}
                    startIcon={<Phone size={14} />} />
                  <FField label={t("account.city")} value={profile.city || ""} onChange={set("city")}
                    startIcon={<MapPin size={14} />} />
                </Stack>
                <FField label={t("account.address")} value={profile.address || ""} onChange={set("address")}
                  startIcon={<MapPin size={14} />} />
              </Stack>
            )}
          </Section>

          {/* Social links */}
          <Section icon={<Globe size={16} />} title={t("account.socialLinks")} subtitle={t("account.socialLinksSub")}>
            {loading ? <SkRow /> : (
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                  <FField label={t("account.instagram")} value={profile.instagram || ""} onChange={set("instagram")}
                    startIcon={<Instagram size={14} />} />
                  <FField label={t("account.facebook")} value={profile.facebook || ""} onChange={set("facebook")}
                    startIcon={<Facebook size={14} />} />
                </Stack>
                <FField label={t("account.website")} value={profile.website || ""} onChange={set("website")}
                  startIcon={<Globe size={14} />} />
              </Stack>
            )}
          </Section>

          {/* Identity document */}
          <Section icon={<FileText size={16} />} title={t("account.identity")} subtitle={t("account.identitySub")}>
            {loading ? <SkRow /> : (
              <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel sx={{ fontSize: 13, "&.Mui-focused": { color: G } }}>
                    {t("account.documentType")}
                  </InputLabel>
                  <Select
                    value={profile.documentType || ""}
                    label={t("account.documentType")}
                    onChange={e => set("documentType")(e.target.value)}
                    sx={{
                      borderRadius: 2, fontSize: 13, bgcolor: alpha("#fff", 0.025),
                      "& fieldset": { borderColor: BR },
                      "&:hover fieldset": { borderColor: alpha("#fff", 0.18) },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: G },
                    }}
                  >
                    <MenuItem value="" sx={{ fontSize: 13 }}><em>—</em></MenuItem>
                    {DOC_TYPES.map(d => (
                      <MenuItem key={d} value={d} sx={{ fontSize: 13 }}>{d}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FField
                  label={t("account.documentNumber")}
                  value={profile.documentNumber || ""}
                  onChange={set("documentNumber")}
                  startIcon={<FileText size={14} />}
                />
              </Stack>
            )}
          </Section>

          {/* Activity (read-only) */}
          <Section icon={<Clock size={16} />} title={t("account.activitySection")} subtitle={t("account.activitySub")}>
            {loading ? <SkRow /> : (
              <Stack spacing={1.25}>
                <ActivityRow
                  icon={<Clock size={15} />}
                  label={t("account.lastLogin")}
                  value={fmtDate((profile as any).lastLoginAt, true) || t("account.never")}
                />
                <ActivityRow
                  icon={<Calendar size={15} />}
                  label={t("account.memberSince")}
                  value={fmtDate((profile as any).registeredAt) || fmtDate((profile as any).createdAt) || "—"}
                />
                <ActivityRow
                  icon={<Calendar size={15} />}
                  label={t("account.registeredAt")}
                  value={fmtDate((profile as any).createdAt, true)}
                />
              </Stack>
            )}
          </Section>

          {/* Save button */}
          {!loading && (
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                onClick={handleSave}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
                sx={{
                  px: 4, py: 1.25, borderRadius: 2.5, fontWeight: 800, fontSize: 14,
                  bgcolor: G, color: "#000",
                  "&:hover": { bgcolor: GD, boxShadow: `0 4px 20px ${alpha(G, 0.35)}` },
                  "&:disabled": { bgcolor: alpha(G, 0.3), color: alpha("#000", 0.4) },
                  transition: "all 0.2s",
                  boxShadow: `0 2px 12px ${alpha(G, 0.2)}`,
                }}
              >
                {saving ? t("account.saving") : t("account.saveChanges")}
              </Button>
            </Box>
          )}
        </Stack>
      </Stack>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast(t => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={toast.sev} variant="filled" onClose={() => setToast(t => ({ ...t, open: false }))}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
