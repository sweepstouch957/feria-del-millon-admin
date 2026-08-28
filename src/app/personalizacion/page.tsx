"use client";
import * as React from "react";
import {
  Box, Card, CardContent, Stack, TextField, Typography, Button, Divider,
  Snackbar, Alert, CircularProgress, IconButton, Tooltip, Switch,
} from "@mui/material";
import {
  Save as SaveIcon, RotateCcw as ResetIcon, Palette as PaletteIcon,
  ChevronUp, ChevronDown, Eye, EyeOff, Plus, Trash2, Menu as MenuIcon,
} from "lucide-react";
import {
  getSiteConfig, updateSiteConfig, SITE_DEFAULTS, SECTION_LABELS,
  type SiteConfig, type SectionKey,
} from "@services/siteConfig.service";
import { uploadCampaignImage } from "@services/upload.service";
import { Upload as UploadIcon, X as XIcon } from "lucide-react";

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Box>
      <Typography variant="caption" fontWeight={500} sx={{ color: "text.secondary", display: "block", mb: 0.75 }}>{label}</Typography>
      <Stack direction="row" flexWrap="wrap" spacing={1} alignItems="center">
        <Box component="input" type="color" value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          sx={{ width: 44, height: 40, p: 0, border: "1px solid", borderColor: "divider", borderRadius: 0, cursor: "pointer", background: "none" }} />
        <TextField size="small" value={value} onChange={(e) => onChange(e.target.value)} sx={{ width: 120 }} />
      </Stack>
    </Box>
  );
}

/* ── Contexto de la página ────────────────────────────────────────────
   Cada tarjeta necesita saber tres cosas: qué hay ahora, qué hay guardado
   y cómo guardar lo suyo. Pasarlo por contexto evita encadenar props por
   23 secciones. */
type PersoCtxValue = {
  cfg: any;
  savedCfg: any;
  savingPath: string | null;
  saveSection: (paths: string[]) => void;
  query: string;
  onlyDirty: boolean;
};
const PersoCtx = React.createContext<PersoCtxValue | null>(null);

/** Lee "content.brand" dentro de un objeto. */
function getPath(obj: any, path: string) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}

/** Escribe "content.brand" sin mutar el original. */
function setPath(obj: any, path: string, value: any) {
  const keys = path.split(".");
  const out = Array.isArray(obj) ? [...obj] : { ...obj };
  let cur: any = out;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = Array.isArray(cur[k]) ? [...cur[k]] : { ...cur[k] };
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return out;
}

const norm = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function Section({
  title,
  hint,
  paths,
  children,
}: {
  title: string;
  /** Una línea que explica dónde se ve esto en el sitio. */
  hint?: string;
  /** Trozos de la config que edita esta tarjeta. */
  paths: string[];
  children: React.ReactNode;
}) {
  const ctx = React.useContext(PersoCtx);
  if (!ctx) return null;

  const dirty = paths.some(
    (path) =>
      JSON.stringify(getPath(ctx.cfg, path)) !==
      JSON.stringify(getPath(ctx.savedCfg, path))
  );

  const q = norm(ctx.query.trim());
  const matches = !q || norm(title).includes(q) || norm(hint || "").includes(q);
  if (!matches) return null;
  if (ctx.onlyDirty && !dirty) return null;

  const saving = ctx.savingPath === paths.join("|");

  return (
    <Card sx={{ borderRadius: 0, borderColor: dirty ? "#3FA46E" : undefined }}>
      <CardContent>
        <Stack
          direction="row"
          flexWrap="wrap"
          alignItems="flex-start"
          justifyContent="space-between"
          gap={1.5}
          mb={2}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1}>
              <Typography fontWeight={500} fontSize={15}>{title}</Typography>
              {dirty && (
                <Box
                  component="span"
                  sx={{
                    width: 6, height: 6, borderRadius: 999, bgcolor: "#3FA46E",
                    flex: "0 0 auto",
                  }}
                  aria-label="Con cambios sin guardar"
                />
              )}
            </Stack>
            {hint && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.4 }}>
                {hint}
              </Typography>
            )}
          </Box>

          {/* El botón solo aparece si hay algo que guardar: sin cambios, no
              hay decisión que tomar. */}
          {dirty && (
            <Button
              size="small"
              variant="contained"
              disableElevation
              disabled={saving}
              onClick={() => ctx.saveSection(paths)}
              startIcon={saving ? <CircularProgress size={12} color="inherit" /> : <SaveIcon size={14} />}
              sx={{ bgcolor: "#3FA46E", "&:hover": { bgcolor: "#14513C" }, flex: "0 0 auto" }}
            >
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          )}
        </Stack>
        <Stack spacing={2}>{children}</Stack>
      </CardContent>
    </Card>
  );
}

// Editor de lista de strings (párrafos, items del ticker, etc.)
function StrList({
  label, items, onChange, multiline = false, placeholder,
}: {
  label: string; items: string[]; onChange: (v: string[]) => void; multiline?: boolean; placeholder?: string;
}) {
  const set = (i: number, v: string) => onChange(items.map((x, idx) => (idx === i ? v : x)));
  const add = () => onChange([...items, ""]);
  const rm = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <Box>
      <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ display: "block", mb: 0.75 }}>{label}</Typography>
      <Stack spacing={1}>
        {items.map((v, i) => (
          <Stack key={i} direction="row" flexWrap="wrap" spacing={1} alignItems="flex-start">
            <TextField size="small" value={v} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} fullWidth multiline={multiline} rows={multiline ? 2 : 1} />
            <IconButton size="small" color="error" onClick={() => rm(i)} sx={{ mt: 0.5 }}><Trash2 size={15} /></IconButton>
          </Stack>
        ))}
        <Button size="small" variant="text" startIcon={<Plus size={14} />} onClick={add} sx={{ textTransform: "none", alignSelf: "flex-start" }}>Agregar</Button>
      </Stack>
    </Box>
  );
}

// Contenedor de fila para listas de objetos (con quitar)
function Row({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <Box sx={{ p: 1.25, borderRadius: 0, border: "1px solid", borderColor: "divider" }}>
      <Stack direction="row" flexWrap="wrap" spacing={1} alignItems="flex-start">
        <Box flex={1}><Stack spacing={1}>{children}</Stack></Box>
        <IconButton size="small" color="error" onClick={onRemove}><Trash2 size={15} /></IconButton>
      </Stack>
    </Box>
  );
}

function AddBtn({ onClick }: { onClick: () => void }) {
  return <Button size="small" variant="outlined" startIcon={<Plus size={15} />} onClick={onClick} sx={{ textTransform: "none", alignSelf: "flex-start" }}>Agregar</Button>;
}

export default function PersonalizacionPage() {
  const [cfg, setCfg] = React.useState<SiteConfig | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploadingImg, setUploadingImg] = React.useState<"" | "hero" | "logo">("");
  const heroFileRef = React.useRef<HTMLInputElement>(null);
  const logoFileRef = React.useRef<HTMLInputElement>(null);
  const [toast, setToast] = React.useState({ open: false, msg: "", sev: "success" as "success" | "error" });
  // Línea base: lo último confirmado por el servidor. Comparar contra esto es
  // lo que permite saber qué tarjeta tiene cambios sin guardar.
  const [savedCfg, setSavedCfg] = React.useState<SiteConfig | null>(null);
  const [savingPath, setSavingPath] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [onlyDirty, setOnlyDirty] = React.useState(false);

  React.useEffect(() => {
    getSiteConfig()
      .then((c) => {
        setCfg(c);
        setSavedCfg(c);
      })
      .catch(() => {
        setCfg(SITE_DEFAULTS);
        setSavedCfg(SITE_DEFAULTS);
      })
      .finally(() => setLoading(false));
  }, []);

  // Setters
  const setTheme = (k: keyof SiteConfig["theme"], v: string) =>
    setCfg((c) => (c ? { ...c, theme: { ...c.theme, [k]: v } } : c));
  const setC = (updater: (content: SiteConfig["content"]) => SiteConfig["content"]) =>
    setCfg((c) => (c ? { ...c, content: updater(c.content) } : c));
  const setBrand = (k: keyof SiteConfig["content"]["brand"], v: string) =>
    setC((ct) => ({ ...ct, brand: { ...ct.brand, [k]: v } }));
  const setSeo = (k: keyof SiteConfig["content"]["seo"], v: string) =>
    setC((ct) => ({ ...ct, seo: { ...ct.seo, [k]: v } }));
  const setHero = (k: keyof SiteConfig["content"]["hero"], v: string) =>
    setC((ct) => ({ ...ct, hero: { ...ct.hero, [k]: v } }));
  const setFeat = (k: "badge" | "title", v: string) =>
    setC((ct) => ({ ...ct, featured: { ...ct.featured, [k]: v } }));
  const setTech = (k: "title" | "subtitle", v: string) =>
    setC((ct) => ({ ...ct, techniques: { ...ct.techniques, [k]: v } }));
  const setContact = (k: keyof SiteConfig["content"]["contact"], v: string) =>
    setC((ct) => ({ ...ct, contact: { ...ct.contact, [k]: v } }));
  const setSocial = (k: keyof SiteConfig["content"]["social"], v: string) =>
    setC((ct) => ({ ...ct, social: { ...ct.social, [k]: v } }));

  // Secciones: visibilidad + orden
  const toggleVisible = (k: SectionKey) =>
    setCfg((c) => (c ? { ...c, sections: { ...c.sections, visible: { ...c.sections.visible, [k]: !c.sections.visible[k] } } } : c));
  const moveSection = (i: number, dir: -1 | 1) =>
    setCfg((c) => {
      if (!c) return c;
      const order = [...c.sections.order];
      const j = i + dir;
      if (j < 0 || j >= order.length) return c;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...c, sections: { ...c.sections, order } };
    });

  // Navbar: editar / mostrar-ocultar / habilitar / reordenar / agregar / quitar
  const setNavItem = (i: number, k: "label" | "href", v: string) =>
    setCfg((c) => (c ? { ...c, nav: { items: c.nav.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)) } } : c));
  const toggleNav = (i: number, k: "visible" | "enabled") =>
    setCfg((c) => (c ? { ...c, nav: { items: c.nav.items.map((it, idx) => (idx === i ? { ...it, [k]: !it[k] } : it)) } } : c));
  const moveNav = (i: number, dir: -1 | 1) =>
    setCfg((c) => {
      if (!c) return c;
      const items = [...c.nav.items];
      const j = i + dir;
      if (j < 0 || j >= items.length) return c;
      [items[i], items[j]] = [items[j], items[i]];
      return { ...c, nav: { items } };
    });
  const addNav = () =>
    setCfg((c) => (c ? { ...c, nav: { items: [...c.nav.items, { label: "Nueva", href: "/", visible: true, enabled: true }] } } : c));
  const removeNav = (i: number) =>
    setCfg((c) => (c ? { ...c, nav: { items: c.nav.items.filter((_, idx) => idx !== i) } } : c));

  // ── Landing v2: setter genérico por bloque ─────────────────────────────
  const setL = (updater: (l: SiteConfig["landing"]) => SiteConfig["landing"]) =>
    setCfg((c) => (c ? { ...c, landing: updater(c.landing) } : c));

  // Página de convocatoria (bases)
  type CP = SiteConfig["landing"]["convocatoriaPage"];
  const setCP = (updater: (cp: CP) => CP) =>
    setL((l) => ({ ...l, convocatoriaPage: updater(l.convocatoriaPage) }));

  /** Guarda SOLO los trozos indicados, sobre la última versión confirmada.
   *  Así "guardar esta tarjeta" guarda esa tarjeta y nada más: los cambios
   *  a medio hacer en otras quedan intactos y siguen marcados. */
  const saveSection = async (paths: string[]) => {
    if (!cfg || !savedCfg) return;
    const key = paths.join("|");
    setSavingPath(key);
    try {
      let payload: any = savedCfg;
      for (const path of paths) {
        payload = setPath(payload, path, getPath(cfg, path));
      }
      const saved = await updateSiteConfig(payload);
      setSavedCfg(saved);
      setToast({ open: true, msg: "Guardado — sale en el sitio en ~1 min", sev: "success" });
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.error || e?.message || "Error al guardar", sev: "error" });
    } finally {
      setSavingPath(null);
    }
  };

  // Cuántas tarjetas tienen cambios sin guardar (para el encabezado y el
  // filtro "solo con cambios").
  const dirtyCount = React.useMemo(() => {
    if (!cfg || !savedCfg) return 0;
    const groups = [
      ["content.brand", "content.seo"], ["theme"], ["sections"], ["nav"],
      ["content.hero"], ["landing.heroMeta"], ["landing.ticker", "landing.showTicker"],
      ["landing.about"], ["landing.techniqueItems"], ["landing.sedes"],
      ["landing.programs"], ["landing.convocatoria"], ["landing.convocatoriaPage"],
      ["landing.newsletter"],
      ["landing.footer", "landing.priceLabel", "landing.showPrices"],
      ["content.featured"], ["content.techniques"], ["content.contact"], ["content.social"],
    ];
    return groups.filter((paths) =>
      paths.some(
        (path) =>
          JSON.stringify(getPath(cfg, path)) !== JSON.stringify(getPath(savedCfg, path))
      )
    ).length;
  }, [cfg, savedCfg]);

  const handleSave = async () => {
    if (!cfg) return;
    setSaving(true);
    try {
      const saved = await updateSiteConfig(cfg);
      setCfg(saved);
      setSavedCfg(saved);
      setToast({ open: true, msg: "Sitio actualizado — los cambios salen en el landing en ~1 min", sev: "success" });
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.error || e?.message || "Error al guardar", sev: "error" });
    } finally { setSaving(false); }
  };

  const uploadImage = async (
    file: File | undefined,
    which: "hero" | "logo",
    apply: (url: string) => void,
    ref: React.RefObject<HTMLInputElement | null>
  ) => {
    if (!file) return;
    setUploadingImg(which);
    try {
      const { url } = await uploadCampaignImage(file, "site");
      apply(url);
      setToast({ open: true, msg: "Imagen subida", sev: "success" });
    } catch (e: any) {
      setToast({ open: true, msg: e?.response?.data?.error || e?.message || "Error al subir la imagen", sev: "error" });
    } finally {
      setUploadingImg("");
      if (ref.current) ref.current.value = "";
    }
  };

  if (loading || !cfg) {
    return <Box sx={{ p: 6, display: "flex", justifyContent: "center" }}><CircularProgress /></Box>;
  }

  const { theme, content, sections, nav, landing } = cfg;

  const cp = landing.convocatoriaPage;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: "auto" }}>
      {/* Header */}
      <Stack direction="row" flexWrap="wrap" alignItems="center" spacing={1.5} mb={3}>
        <Box sx={{ width: 40, height: 40, borderRadius: 0, bgcolor: "rgba(34,197,94,0.14)", color: "#3FA46E", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PaletteIcon size={20} />
        </Box>
        <Box flex={1}>
          <Typography fontWeight={500} fontSize={20}>Personalización del sitio</Typography>
          <Typography variant="caption" color="text.secondary">Colores, textos, imágenes y secciones del landing</Typography>
        </Box>
        <Tooltip title="Restaurar valores por defecto">
          <IconButton onClick={() => setCfg(SITE_DEFAULTS)}><ResetIcon size={18} /></IconButton>
        </Tooltip>
        <Button variant="contained" disableElevation onClick={handleSave} disabled={saving || dirtyCount === 0}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon size={16} />}
          sx={{ fontWeight: 500, textTransform: "none", boxShadow: "none", bgcolor: "#3FA46E", "&:hover": { bgcolor: "#14513C", boxShadow: "none" } }}>
          {saving ? "Guardando…" : dirtyCount > 0 ? `Guardar todo (${dirtyCount})` : "Sin cambios"}
        </Button>
      </Stack>

      {/* Buscador: 23 tarjetas en una página son muchas para recorrer a ojo. */}
      <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1.5} mb={2.5}>
        <TextField
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar sección…"
          sx={{ flex: "1 1 220px", maxWidth: 340 }}
        />
        <Button
          size="small"
          variant={onlyDirty ? "contained" : "outlined"}
          disableElevation
          onClick={() => setOnlyDirty((v) => !v)}
          disabled={dirtyCount === 0 && !onlyDirty}
          sx={onlyDirty ? { bgcolor: "#3FA46E", "&:hover": { bgcolor: "#14513C" } } : undefined}
        >
          Solo con cambios{dirtyCount > 0 ? ` (${dirtyCount})` : ""}
        </Button>
        {(query || onlyDirty) && (
          <Button size="small" onClick={() => { setQuery(""); setOnlyDirty(false); }}>
            Limpiar
          </Button>
        )}
      </Stack>

      <PersoCtx.Provider
        value={{ cfg, savedCfg, savingPath, saveSection, query, onlyDirty }}
      >
      <Stack spacing={2.5}>
        {/* Marca y SEO */}
        <Section
          title="Marca y SEO"
          hint="Nombre, lema y cómo aparece el sitio en buscadores."
          paths={["content.brand", "content.seo"]}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Nombre de marca (navbar)" value={content.brand.name} onChange={(e) => setBrand("name", e.target.value)} fullWidth />
            <TextField size="small" label="Tagline (navbar)" value={content.brand.tagline} onChange={(e) => setBrand("tagline", e.target.value)} fullWidth />
          </Stack>
          {/* Logo */}
          <Box>
            <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
              Logo (opcional — vacío = ícono por defecto)
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
              {content.brand.logo ? (
                <Box sx={{ position: "relative", width: 56, height: 56, borderRadius: 0, overflow: "hidden", border: "1px solid", borderColor: "divider", flexShrink: 0 }}>
                  <Box component="img" src={content.brand.logo} alt="logo" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <IconButton size="small" onClick={() => setBrand("logo", "")}
                    sx={{ position: "absolute", top: 1, right: 1, bgcolor: "rgba(0,0,0,0.6)", color: "#fff", "&:hover": { bgcolor: "rgba(0,0,0,0.8)" } }}>
                    <XIcon size={11} />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ width: 56, height: 56, borderRadius: 0, border: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center", color: "text.disabled", flexShrink: 0 }}>
                  <PaletteIcon size={18} />
                </Box>
              )}
              <Stack spacing={1} flex={1} width="100%">
                <Button size="small" variant="outlined" startIcon={uploadingImg === "logo" ? <CircularProgress size={14} /> : <UploadIcon size={15} />}
                  onClick={() => logoFileRef.current?.click()} disabled={uploadingImg === "logo"}
                  sx={{ textTransform: "none", alignSelf: "flex-start" }}>
                  {uploadingImg === "logo" ? "Subiendo…" : "Subir logo"}
                </Button>
                <TextField size="small" label="…o pega una URL" value={content.brand.logo}
                  onChange={(e) => setBrand("logo", e.target.value)} fullWidth placeholder="https://…" />
              </Stack>
            </Stack>
            <input ref={logoFileRef} type="file" accept="image/*" hidden
              onChange={(e) => uploadImage(e.target.files?.[0], "logo", (url) => setBrand("logo", url), logoFileRef)} />
          </Box>
          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">SEO (pestaña del navegador)</Typography></Divider>
          <TextField size="small" label="Título de la pestaña" value={content.seo.title} onChange={(e) => setSeo("title", e.target.value)} fullWidth />
          <TextField size="small" label="Descripción (meta description)" value={content.seo.description} onChange={(e) => setSeo("description", e.target.value)} fullWidth multiline rows={2} />
        </Section>

        {/* Tema — paleta editorial de la landing */}
        <Section
          title="Tema — colores de la landing"
          hint="Paleta que usa todo el sitio público."
          paths={["theme"]}
        >
          <Typography variant="caption" color="text.secondary">
            Colores del tema claro. El modo oscuro se genera automáticamente.
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
            <ColorField label="Verde (acento)" value={theme.accent} onChange={(v) => setTheme("accent", v)} />
            <ColorField label="Verde profundo (sedes)" value={theme.greenDeep ?? "#14513C"} onChange={(v) => setTheme("greenDeep", v)} />
            <ColorField label="Acento oscuro" value={theme.accentDark} onChange={(v) => setTheme("accentDark", v)} />
            <ColorField label="Fondo (crema)" value={theme.bg ?? "#F7F6F2"} onChange={(v) => setTheme("bg", v)} />
            <ColorField label="Texto" value={theme.fg ?? "#0B0B0A"} onChange={(v) => setTheme("fg", v)} />
            <ColorField label="Panel oscuro" value={theme.panel ?? "#0B0B0A"} onChange={(v) => setTheme("panel", v)} />
            <ColorField label="Texto sobre oscuro" value={theme.onDark ?? "#F5F4EF"} onChange={(v) => setTheme("onDark", v)} />
          </Box>
          <Divider />
          <Box>
            <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ display: "block", mb: 1 }}>Vista previa</Typography>
            <Box sx={{ borderRadius: 0, overflow: "hidden", border: "1px solid", borderColor: "divider", background: theme.panel ?? "#0B0B0A", p: 3, textAlign: "center" }}>
              <Typography sx={{ fontFamily: "Jost, sans-serif", fontWeight: 200, fontSize: 34, textTransform: "uppercase", color: theme.onDark ?? "#F5F4EF", lineHeight: 1 }}>
                Feria <span style={{ color: theme.accent }}>del</span> <b style={{ fontWeight: 500 }}>Millón</b>
              </Typography>
            </Box>
            <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
              {[
                ["Fondo", theme.bg ?? "#F7F6F2"], ["Texto", theme.fg ?? "#0B0B0A"], ["Panel", theme.panel ?? "#0B0B0A"],
                ["Verde", theme.accent], ["Verde profundo", theme.greenDeep ?? "#14513C"],
              ].map(([lbl, col]) => (
                <Box key={lbl} sx={{ textAlign: "center" }}>
                  <Box sx={{ width: 44, height: 32, borderRadius: 0, border: "1px solid", borderColor: "divider", background: col }} />
                  <Typography variant="caption" sx={{ fontSize: 9, color: "text.secondary" }}>{lbl}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Section>

        {/* Secciones: orden + visibilidad */}
        <Section
          title="Secciones — orden y visibilidad"
          hint="Qué bloques se muestran en la portada y en qué orden."
          paths={["sections"]}
        >
          <Typography variant="caption" color="text.secondary">
            Reordena con las flechas y muestra/oculta con el interruptor. El Hero (portada) siempre va primero.
          </Typography>
          <Stack spacing={1}>
            {sections.order.map((k, i) => (
              <Stack key={k} direction="row" flexWrap="wrap" alignItems="center" spacing={1}
                sx={{ p: 1, borderRadius: 0, border: "1px solid", borderColor: "divider" }}>
                <Stack>
                  <IconButton size="small" disabled={i === 0} onClick={() => moveSection(i, -1)}><ChevronUp size={16} /></IconButton>
                  <IconButton size="small" disabled={i === sections.order.length - 1} onClick={() => moveSection(i, 1)}><ChevronDown size={16} /></IconButton>
                </Stack>
                <Typography flex={1} fontWeight={500} fontSize={14} sx={{ opacity: sections.visible[k] ? 1 : 0.5 }}>
                  {SECTION_LABELS[k]}
                </Typography>
                {sections.visible[k] ? <Eye size={16} /> : <EyeOff size={16} color="#8E8A80" />}
                <Switch checked={sections.visible[k]} onChange={() => toggleVisible(k)} size="small" />
              </Stack>
            ))}
          </Stack>
        </Section>

        {/* Navbar — pestañas configurables */}
        <Section
          title="Navbar — pestañas del menú"
          hint="Enlaces de la barra superior."
          paths={["nav"]}
        >
          <Stack direction="row" flexWrap="wrap" spacing={1} alignItems="center">
            <MenuIcon size={16} />
            <Typography variant="caption" color="text.secondary">
              <b>Mostrar</b> = aparece en el menú. <b>Habilitada</b> = clickable (apagada = se ve en gris como “Próximamente”). Reordena con las flechas.
            </Typography>
          </Stack>
          <Stack spacing={1}>
            {nav.items.map((it, i) => (
              <Box key={i} sx={{ p: 1.25, borderRadius: 0, border: "1px solid", borderColor: "divider" }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                  <Stack>
                    <IconButton size="small" disabled={i === 0} onClick={() => moveNav(i, -1)}><ChevronUp size={15} /></IconButton>
                    <IconButton size="small" disabled={i === nav.items.length - 1} onClick={() => moveNav(i, 1)}><ChevronDown size={15} /></IconButton>
                  </Stack>
                  <TextField size="small" label="Texto" value={it.label} onChange={(e) => setNavItem(i, "label", e.target.value)} sx={{ minWidth: 140 }} />
                  <TextField size="small" label="Ruta (href)" value={it.href} onChange={(e) => setNavItem(i, "href", e.target.value)} fullWidth placeholder="/catalogo" />
                  <Stack direction="row" flexWrap="wrap" spacing={1.5} alignItems="center">
                    <Tooltip title={it.visible ? "Se muestra" : "Oculta"}>
                      <Stack alignItems="center" spacing={0}>
                        {it.visible ? <Eye size={15} /> : <EyeOff size={15} color="#8E8A80" />}
                        <Switch checked={it.visible} onChange={() => toggleNav(i, "visible")} size="small" />
                        <Typography variant="caption" color="text.secondary">Mostrar</Typography>
                      </Stack>
                    </Tooltip>
                    <Stack alignItems="center" spacing={0}>
                      <Switch checked={it.enabled} onChange={() => toggleNav(i, "enabled")} size="small" color="success" />
                      <Typography variant="caption" color="text.secondary">Habilitada</Typography>
                    </Stack>
                    <Tooltip title="Quitar pestaña">
                      <IconButton size="small" color="error" onClick={() => removeNav(i)}><Trash2 size={15} /></IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
          <Button size="small" variant="outlined" startIcon={<Plus size={15} />} onClick={addNav} sx={{ textTransform: "none", alignSelf: "flex-start" }}>
            Agregar pestaña
          </Button>
        </Section>

        {/* Hero */}
        <Section
          title="Portada (hero)"
          hint="Lo primero que se ve al entrar."
          paths={["content.hero"]}
        >
          <TextField size="small" label="Badge" value={content.hero.badge} onChange={(e) => setHero("badge", e.target.value)} fullWidth />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Título" value={content.hero.title} onChange={(e) => setHero("title", e.target.value)} fullWidth />
            <TextField size="small" label="Subtítulo" value={content.hero.subtitle} onChange={(e) => setHero("subtitle", e.target.value)} fullWidth />
          </Stack>
          <TextField size="small" label="Párrafo" value={content.hero.paragraph} onChange={(e) => setHero("paragraph", e.target.value)} fullWidth multiline rows={3} />

          {/* Imagen de fondo: subir o pegar URL. Vacío = usar gradiente. */}
          <Box>
            <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
              Imagen de fondo del hero (opcional — vacío = gradiente)
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
              {content.hero.image ? (
                <Box sx={{ position: "relative", width: 120, height: 68, borderRadius: 0, overflow: "hidden", border: "1px solid", borderColor: "divider", flexShrink: 0 }}>
                  <Box component="img" src={content.hero.image} alt="hero" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <IconButton size="small" onClick={() => setHero("image", "")}
                    sx={{ position: "absolute", top: 2, right: 2, bgcolor: "rgba(0,0,0,0.6)", color: "#fff", "&:hover": { bgcolor: "rgba(0,0,0,0.8)" } }}>
                    <XIcon size={12} />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ width: 120, height: 68, borderRadius: 0, border: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center", color: "text.disabled", flexShrink: 0 }}>
                  <Typography variant="caption">Sin imagen</Typography>
                </Box>
              )}
              <Stack spacing={1} flex={1} width="100%">
                <Button size="small" variant="outlined" startIcon={uploadingImg === "hero" ? <CircularProgress size={14} /> : <UploadIcon size={15} />}
                  onClick={() => heroFileRef.current?.click()} disabled={uploadingImg === "hero"}
                  sx={{ textTransform: "none", alignSelf: "flex-start" }}>
                  {uploadingImg === "hero" ? "Subiendo…" : "Subir imagen"}
                </Button>
                <TextField size="small" label="…o pega una URL" value={content.hero.image}
                  onChange={(e) => setHero("image", e.target.value)} fullWidth placeholder="https://…" />
              </Stack>
            </Stack>
            <input ref={heroFileRef} type="file" accept="image/*" hidden
              onChange={(e) => uploadImage(e.target.files?.[0], "hero", (url) => setHero("image", url), heroFileRef)} />
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Botón principal" value={content.hero.ctaPrimaryLabel} onChange={(e) => setHero("ctaPrimaryLabel", e.target.value)} fullWidth />
            <TextField size="small" label="Botón secundario" value={content.hero.ctaSecondaryLabel} onChange={(e) => setHero("ctaSecondaryLabel", e.target.value)} fullWidth />
          </Stack>
          <TextField size="small" label="Botón de tickets" value={content.hero.ticketsLabel} onChange={(e) => setHero("ticketsLabel", e.target.value)} fullWidth />
        </Section>

        {/* ═══ LANDING v2 — bloques editables ═══ */}
        <Divider textAlign="left"><Typography variant="overline" fontWeight={500} color="text.secondary">Contenido del landing</Typography></Divider>

        {/* Hero — barra y datos */}
        <Section
          title="Portada — barra superior y datos"
          hint="Edición, ciudad y año sobre la portada."
          paths={["landing.heroMeta"]}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Edición (izq.)" value={landing.heroMeta.edition} onChange={(e) => setL((l) => ({ ...l, heroMeta: { ...l.heroMeta, edition: e.target.value } }))} fullWidth />
            <TextField size="small" label="Ubicación (centro)" value={landing.heroMeta.location} onChange={(e) => setL((l) => ({ ...l, heroMeta: { ...l.heroMeta, location: e.target.value } }))} fullWidth />
            <TextField size="small" label="Año (der.)" value={landing.heroMeta.year} onChange={(e) => setL((l) => ({ ...l, heroMeta: { ...l.heroMeta, year: e.target.value } }))} sx={{ minWidth: 100 }} />
          </Stack>
          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Datos (pie del hero)</Typography></Divider>
          {landing.heroMeta.stats.map((s, i) => (
            <Row key={i} onRemove={() => setL((l) => ({ ...l, heroMeta: { ...l.heroMeta, stats: l.heroMeta.stats.filter((_, idx) => idx !== i) } }))}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField size="small" label="Etiqueta" value={s.label} onChange={(e) => setL((l) => ({ ...l, heroMeta: { ...l.heroMeta, stats: l.heroMeta.stats.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)) } }))} sx={{ minWidth: 160 }} />
                <TextField size="small" label="Valor" value={s.value} onChange={(e) => setL((l) => ({ ...l, heroMeta: { ...l.heroMeta, stats: l.heroMeta.stats.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)) } }))} fullWidth />
              </Stack>
            </Row>
          ))}
          <AddBtn onClick={() => setL((l) => ({ ...l, heroMeta: { ...l.heroMeta, stats: [...l.heroMeta.stats, { label: "Nuevo", value: "" }] } }))} />
        </Section>

        {/* Ticker */}
        <Section
          title="Ticker (cinta que se desliza)"
          hint="Cinta de texto en movimiento bajo la portada."
          paths={["landing.ticker", "landing.showTicker"]}
        >
          <Stack direction="row" flexWrap="wrap" spacing={2} alignItems="center">
            <Stack direction="row" flexWrap="wrap" alignItems="center"><Switch checked={landing.showTicker} onChange={() => setL((l) => ({ ...l, showTicker: !l.showTicker }))} /><Typography variant="body2">Mostrar ticker</Typography></Stack>
          </Stack>
          <StrList label="Palabras / frases del ticker" items={landing.ticker.items} onChange={(items) => setL((l) => ({ ...l, ticker: { ...l.ticker, items } }))} placeholder="Pintura" />
        </Section>

        {/* La feria (about) */}
        <Section
          title="La feria (intro + estadísticas)"
          hint="Bloque de presentación con cifras."
          paths={["landing.about"]}
        >
          <TextField size="small" label="Badge" value={landing.about.badge} onChange={(e) => setL((l) => ({ ...l, about: { ...l.about, badge: e.target.value } }))} fullWidth />
          <TextField size="small" label="Título" value={landing.about.title} onChange={(e) => setL((l) => ({ ...l, about: { ...l.about, title: e.target.value } }))} fullWidth multiline rows={2} />
          <StrList label="Párrafos" multiline items={landing.about.paragraphs} onChange={(paragraphs) => setL((l) => ({ ...l, about: { ...l.about, paragraphs } }))} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Texto del enlace" value={landing.about.ctaLabel} onChange={(e) => setL((l) => ({ ...l, about: { ...l.about, ctaLabel: e.target.value } }))} fullWidth />
            <TextField size="small" label="Ruta del enlace" value={landing.about.ctaHref} onChange={(e) => setL((l) => ({ ...l, about: { ...l.about, ctaHref: e.target.value } }))} fullWidth />
          </Stack>
          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Estadísticas grandes</Typography></Divider>
          {landing.about.stats.map((s, i) => (
            <Row key={i} onRemove={() => setL((l) => ({ ...l, about: { ...l.about, stats: l.about.stats.filter((_, idx) => idx !== i) } }))}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <TextField size="small" label="Número" value={s.value} onChange={(e) => setL((l) => ({ ...l, about: { ...l.about, stats: l.about.stats.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)) } }))} sx={{ width: 120 }} />
                <TextField size="small" label="Etiqueta" value={s.label} onChange={(e) => setL((l) => ({ ...l, about: { ...l.about, stats: l.about.stats.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)) } }))} fullWidth />
                <Stack direction="row" flexWrap="wrap" alignItems="center"><Switch size="small" color="success" checked={!!s.accent} onChange={() => setL((l) => ({ ...l, about: { ...l.about, stats: l.about.stats.map((x, idx) => (idx === i ? { ...x, accent: !x.accent } : x)) } }))} /><Typography variant="caption">Verde</Typography></Stack>
              </Stack>
            </Row>
          ))}
          <AddBtn onClick={() => setL((l) => ({ ...l, about: { ...l.about, stats: [...l.about.stats, { value: "", label: "Nuevo" }] } }))} />
        </Section>

        {/* Técnicas — tarjetas */}
        <Section
          title="Técnicas — tarjetas (imagen + nombre)"
          hint="Tarjetas ilustradas de la sección de técnicas."
          paths={["landing.techniqueItems"]}
        >
          {landing.techniqueItems.map((t, i) => (
            <Row key={i} onRemove={() => setL((l) => ({ ...l, techniqueItems: l.techniqueItems.filter((_, idx) => idx !== i) }))}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField size="small" label="Nombre" value={t.name} onChange={(e) => setL((l) => ({ ...l, techniqueItems: l.techniqueItems.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)) }))} sx={{ minWidth: 140 }} />
                <TextField size="small" label="Imagen (URL)" value={t.image} onChange={(e) => setL((l) => ({ ...l, techniqueItems: l.techniqueItems.map((x, idx) => (idx === i ? { ...x, image: e.target.value } : x)) }))} fullWidth />
                <TextField size="small" label="Enlace" value={t.href} onChange={(e) => setL((l) => ({ ...l, techniqueItems: l.techniqueItems.map((x, idx) => (idx === i ? { ...x, href: e.target.value } : x)) }))} sx={{ minWidth: 160 }} />
              </Stack>
            </Row>
          ))}
          <AddBtn onClick={() => setL((l) => ({ ...l, techniqueItems: [...l.techniqueItems, { name: "Nueva", image: "", href: "/catalogo" }] }))} />
        </Section>

        {/* Sedes */}
        <Section
          title="Sedes"
          hint="Ciudades y espacios donde ocurre la feria."
          paths={["landing.sedes"]}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Badge" value={landing.sedes.badge} onChange={(e) => setL((l) => ({ ...l, sedes: { ...l.sedes, badge: e.target.value } }))} sx={{ minWidth: 140 }} />
            <TextField size="small" label="Título" value={landing.sedes.title} onChange={(e) => setL((l) => ({ ...l, sedes: { ...l.sedes, title: e.target.value } }))} fullWidth />
          </Stack>
          <TextField size="small" label="Subtítulo" value={landing.sedes.subtitle} onChange={(e) => setL((l) => ({ ...l, sedes: { ...l.sedes, subtitle: e.target.value } }))} fullWidth multiline rows={2} />
          {landing.sedes.items.map((s, i) => (
            <Row key={i} onRemove={() => setL((l) => ({ ...l, sedes: { ...l.sedes, items: l.sedes.items.filter((_, idx) => idx !== i) } }))}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <TextField size="small" label="Ciudad" value={s.name} onChange={(e) => setL((l) => ({ ...l, sedes: { ...l.sedes, items: l.sedes.items.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)) } }))} sx={{ minWidth: 160 }} />
                <TextField size="small" label="Etiqueta" value={s.tag} onChange={(e) => setL((l) => ({ ...l, sedes: { ...l.sedes, items: l.sedes.items.map((x, idx) => (idx === i ? { ...x, tag: e.target.value } : x)) } }))} fullWidth />
                <Stack direction="row" flexWrap="wrap" alignItems="center"><Switch size="small" color="success" checked={!!s.highlight} onChange={() => setL((l) => ({ ...l, sedes: { ...l.sedes, items: l.sedes.items.map((x, idx) => (idx === i ? { ...x, highlight: !x.highlight } : x)) } }))} /><Typography variant="caption">Destacar</Typography></Stack>
              </Stack>
            </Row>
          ))}
          <AddBtn onClick={() => setL((l) => ({ ...l, sedes: { ...l.sedes, items: [...l.sedes.items, { name: "Nueva", tag: "Sede" }] } }))} />
        </Section>

        {/* Programas */}
        <Section
          title="Programas"
          hint="Actividades y programación."
          paths={["landing.programs"]}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Badge" value={landing.programs.badge} onChange={(e) => setL((l) => ({ ...l, programs: { ...l.programs, badge: e.target.value } }))} sx={{ minWidth: 140 }} />
            <TextField size="small" label="Título" value={landing.programs.title} onChange={(e) => setL((l) => ({ ...l, programs: { ...l.programs, title: e.target.value } }))} fullWidth />
          </Stack>
          {landing.programs.items.map((p, i) => (
            <Row key={i} onRemove={() => setL((l) => ({ ...l, programs: { ...l.programs, items: l.programs.items.filter((_, idx) => idx !== i) } }))}>
              <TextField size="small" label="Título" value={p.title} onChange={(e) => setL((l) => ({ ...l, programs: { ...l.programs, items: l.programs.items.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)) } }))} fullWidth />
              <TextField size="small" label="Descripción" value={p.description} onChange={(e) => setL((l) => ({ ...l, programs: { ...l.programs, items: l.programs.items.map((x, idx) => (idx === i ? { ...x, description: e.target.value } : x)) } }))} fullWidth multiline rows={2} />
              <TextField size="small" label="Enlace" value={p.href} onChange={(e) => setL((l) => ({ ...l, programs: { ...l.programs, items: l.programs.items.map((x, idx) => (idx === i ? { ...x, href: e.target.value } : x)) } }))} fullWidth />
            </Row>
          ))}
          <AddBtn onClick={() => setL((l) => ({ ...l, programs: { ...l.programs, items: [...l.programs.items, { title: "Nuevo", description: "", href: "#" }] } }))} />
        </Section>

        {/* Convocatoria */}
        <Section
          title="Convocatoria"
          hint="Bloque de convocatoria en la portada."
          paths={["landing.convocatoria"]}
        >
          <Stack direction="row" flexWrap="wrap" alignItems="center"><Switch checked={landing.convocatoria.open} onChange={() => setL((l) => ({ ...l, convocatoria: { ...l.convocatoria, open: !l.convocatoria.open } }))} color="success" /><Typography variant="body2">Convocatoria abierta (apagado = se oculta la sección)</Typography></Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Badge" value={landing.convocatoria.badge} onChange={(e) => setL((l) => ({ ...l, convocatoria: { ...l.convocatoria, badge: e.target.value } }))} fullWidth />
            <TextField size="small" label="Título" value={landing.convocatoria.title} onChange={(e) => setL((l) => ({ ...l, convocatoria: { ...l.convocatoria, title: e.target.value } }))} sx={{ minWidth: 140 }} />
            <TextField size="small" label="Título (acento verde)" value={landing.convocatoria.titleAccent} onChange={(e) => setL((l) => ({ ...l, convocatoria: { ...l.convocatoria, titleAccent: e.target.value } }))} sx={{ minWidth: 160 }} />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Fecha apertura" value={landing.convocatoria.openDate} onChange={(e) => setL((l) => ({ ...l, convocatoria: { ...l.convocatoria, openDate: e.target.value } }))} fullWidth />
            <TextField size="small" label="Fecha cierre" value={landing.convocatoria.closeDate} onChange={(e) => setL((l) => ({ ...l, convocatoria: { ...l.convocatoria, closeDate: e.target.value } }))} fullWidth />
          </Stack>
          <TextField size="small" label="Párrafo" value={landing.convocatoria.paragraph} onChange={(e) => setL((l) => ({ ...l, convocatoria: { ...l.convocatoria, paragraph: e.target.value } }))} fullWidth multiline rows={2} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Botón 1 — texto" value={landing.convocatoria.ctaPrimaryLabel} onChange={(e) => setL((l) => ({ ...l, convocatoria: { ...l.convocatoria, ctaPrimaryLabel: e.target.value } }))} fullWidth />
            <TextField size="small" label="Botón 1 — ruta" value={landing.convocatoria.primaryHref} onChange={(e) => setL((l) => ({ ...l, convocatoria: { ...l.convocatoria, primaryHref: e.target.value } }))} fullWidth />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Botón 2 — texto" value={landing.convocatoria.ctaSecondaryLabel} onChange={(e) => setL((l) => ({ ...l, convocatoria: { ...l.convocatoria, ctaSecondaryLabel: e.target.value } }))} fullWidth />
            <TextField size="small" label="Botón 2 — ruta" value={landing.convocatoria.secondaryHref} onChange={(e) => setL((l) => ({ ...l, convocatoria: { ...l.convocatoria, secondaryHref: e.target.value } }))} fullWidth />
          </Stack>
        </Section>

        {/* ═══ PÁGINA DE CONVOCATORIA (bases) ═══ */}
        <Divider textAlign="left"><Typography variant="overline" fontWeight={500} color="text.secondary">Página de convocatoria</Typography></Divider>

        <Section
          title="Convocatoria — portada"
          hint="Encabezado de la página de convocatoria."
          paths={["landing.convocatoriaPage"]}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Título" value={cp.hero.title} onChange={(e) => setCP((c) => ({ ...c, hero: { ...c.hero, title: e.target.value } }))} fullWidth />
            <TextField size="small" label="Título (bold)" value={cp.hero.titleStrong} onChange={(e) => setCP((c) => ({ ...c, hero: { ...c.hero, titleStrong: e.target.value } }))} sx={{ minWidth: 140 }} />
            <TextField size="small" label="Año" value={cp.hero.year} onChange={(e) => setCP((c) => ({ ...c, hero: { ...c.hero, year: e.target.value } }))} sx={{ width: 100 }} />
          </Stack>
          <TextField size="small" label="Párrafo" value={cp.hero.paragraph} onChange={(e) => setCP((c) => ({ ...c, hero: { ...c.hero, paragraph: e.target.value } }))} fullWidth multiline rows={2} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Badge izq." value={cp.hero.badgeLeft} onChange={(e) => setCP((c) => ({ ...c, hero: { ...c.hero, badgeLeft: e.target.value } }))} fullWidth />
            <TextField size="small" label="Badge centro" value={cp.hero.badgeCenter} onChange={(e) => setCP((c) => ({ ...c, hero: { ...c.hero, badgeCenter: e.target.value } }))} fullWidth />
            <TextField size="small" label="Badge der." value={cp.hero.badgeRight} onChange={(e) => setCP((c) => ({ ...c, hero: { ...c.hero, badgeRight: e.target.value } }))} fullWidth />
          </Stack>
          <TextField size="small" label="Botón principal (hero)" value={cp.hero.ctaPrimary} onChange={(e) => setCP((c) => ({ ...c, hero: { ...c.hero, ctaPrimary: e.target.value } }))} fullWidth />
          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Fechas</Typography></Divider>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Etiqueta apertura" value={cp.dates.openLabel} onChange={(e) => setCP((c) => ({ ...c, dates: { ...c.dates, openLabel: e.target.value } }))} sx={{ minWidth: 160 }} />
            <TextField size="small" label="Valor apertura" value={cp.dates.openValue} onChange={(e) => setCP((c) => ({ ...c, dates: { ...c.dates, openValue: e.target.value } }))} fullWidth />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Selección" value={cp.dates.seleccionValue} onChange={(e) => setCP((c) => ({ ...c, dates: { ...c.dates, seleccionValue: e.target.value } }))} fullWidth />
            <TextField size="small" label="Evento" value={cp.dates.eventoValue} onChange={(e) => setCP((c) => ({ ...c, dates: { ...c.dates, eventoValue: e.target.value } }))} fullWidth />
          </Stack>
          <StrList label="Correos de contacto" items={cp.contactEmails} onChange={(v) => setCP((c) => ({ ...c, contactEmails: v }))} placeholder="correo@feriadelmillon.com" />
          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Estadísticas del hero</Typography></Divider>
          {cp.stats.map((s, i) => (
            <Row key={i} onRemove={() => setCP((c) => ({ ...c, stats: c.stats.filter((_, idx) => idx !== i) }))}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <TextField size="small" label="Valor" value={s.value} onChange={(e) => setCP((c) => ({ ...c, stats: c.stats.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x) }))} sx={{ width: 120 }} />
                <TextField size="small" label="Etiqueta" value={s.label} onChange={(e) => setCP((c) => ({ ...c, stats: c.stats.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x) }))} fullWidth />
                <Stack direction="row" flexWrap="wrap" alignItems="center"><Switch size="small" color="success" checked={!!s.accent} onChange={() => setCP((c) => ({ ...c, stats: c.stats.map((x, idx) => idx === i ? { ...x, accent: !x.accent } : x) }))} /><Typography variant="caption">Verde</Typography></Stack>
              </Stack>
            </Row>
          ))}
          <AddBtn onClick={() => setCP((c) => ({ ...c, stats: [...c.stats, { value: "", label: "Nuevo" }] }))} />
          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Mensaje cuando está CERRADA</Typography></Divider>
          <TextField size="small" label="Título cerrada" value={cp.closed.title} onChange={(e) => setCP((c) => ({ ...c, closed: { ...c.closed, title: e.target.value } }))} fullWidth />
          <TextField size="small" label="Mensaje cerrada" value={cp.closed.message} onChange={(e) => setCP((c) => ({ ...c, closed: { ...c.closed, message: e.target.value } }))} fullWidth multiline rows={2} />
          <Typography variant="caption" color="text.secondary">El estado abierto/cerrado se controla con el interruptor de la sección “Convocatoria” de arriba.</Typography>
        </Section>

        <Section
          title="Convocatoria — textos"
          hint="Copys de la página de convocatoria."
          paths={["landing.convocatoriaPage"]}
        >
          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">01 · La feria</Typography></Divider>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Título" value={cp.intro.title} onChange={(e) => setCP((c) => ({ ...c, intro: { ...c.intro, title: e.target.value } }))} fullWidth />
            <TextField size="small" label="Título (bold)" value={cp.intro.titleStrong} onChange={(e) => setCP((c) => ({ ...c, intro: { ...c.intro, titleStrong: e.target.value } }))} fullWidth />
          </Stack>
          <StrList label="Párrafos" multiline items={cp.intro.paragraphs} onChange={(v) => setCP((c) => ({ ...c, intro: { ...c.intro, paragraphs: v } }))} />
          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">02 · Impacto</Typography></Divider>
          <StrList label="Items de impacto" items={cp.impacto.items} onChange={(v) => setCP((c) => ({ ...c, impacto: { ...c.impacto, items: v } }))} />
          <TextField size="small" label="Nota de impacto" value={cp.impacto.note} onChange={(e) => setCP((c) => ({ ...c, impacto: { ...c.impacto, note: e.target.value } }))} fullWidth multiline rows={2} />
          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">11 · Llamado final</Typography></Divider>
          <TextField size="small" label="Párrafo CTA" value={cp.cta.paragraph} onChange={(e) => setCP((c) => ({ ...c, cta: { ...c.cta, paragraph: e.target.value } }))} fullWidth multiline rows={2} />
          <TextField size="small" label="Nota CTA" value={cp.cta.note} onChange={(e) => setCP((c) => ({ ...c, cta: { ...c.cta, note: e.target.value } }))} fullWidth />
        </Section>

        <Section
          title="Convocatoria — quién participa / requisitos"
          hint="Condiciones para postular."
          paths={["landing.convocatoriaPage"]}
        >
          {(["participantes", "requisitos"] as const).map((key) => (
            <Box key={key} sx={{ p: 1.25, borderRadius: 0, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" fontWeight={500} color="text.secondary">{key === "participantes" ? "04 · Quién participa" : "05 · Requisitos del proyecto"}</Typography>
              <StrList label={cp[key].noTitle} items={cp[key].no} onChange={(v) => setCP((c) => ({ ...c, [key]: { ...c[key], no: v } }))} />
              <StrList label={cp[key].siTitle} items={cp[key].si} onChange={(v) => setCP((c) => ({ ...c, [key]: { ...c[key], si: v } }))} />
            </Box>
          ))}
        </Section>

        <Section
          title="Convocatoria — documentos y pasos"
          hint="Qué debe preparar el artista."
          paths={["landing.convocatoriaPage"]}
        >
          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">06 · Documentos requeridos</Typography></Divider>
          {cp.documentos.items.map((d, i) => (
            <Row key={i} onRemove={() => setCP((c) => ({ ...c, documentos: { ...c.documentos, items: c.documentos.items.filter((_, idx) => idx !== i) } }))}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField size="small" label="Documento" value={d.title} onChange={(e) => setCP((c) => ({ ...c, documentos: { ...c.documentos, items: c.documentos.items.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x) } }))} fullWidth />
                <TextField size="small" label="Especificación" value={d.spec} onChange={(e) => setCP((c) => ({ ...c, documentos: { ...c.documentos, items: c.documentos.items.map((x, idx) => idx === i ? { ...x, spec: e.target.value } : x) } }))} fullWidth />
              </Stack>
            </Row>
          ))}
          <AddBtn onClick={() => setCP((c) => ({ ...c, documentos: { ...c.documentos, items: [...c.documentos.items, { title: "Nuevo", spec: "" }] } }))} />
          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">07 · Pasos de inscripción</Typography></Divider>
          {cp.pasos.items.map((p, i) => (
            <Row key={i} onRemove={() => setCP((c) => ({ ...c, pasos: { ...c.pasos, items: c.pasos.items.filter((_, idx) => idx !== i) } }))}>
              <TextField size="small" label="Título" value={p.title} onChange={(e) => setCP((c) => ({ ...c, pasos: { ...c.pasos, items: c.pasos.items.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x) } }))} fullWidth />
              <TextField size="small" label="Descripción" value={p.description} onChange={(e) => setCP((c) => ({ ...c, pasos: { ...c.pasos, items: c.pasos.items.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x) } }))} fullWidth multiline rows={2} />
            </Row>
          ))}
          <AddBtn onClick={() => setCP((c) => ({ ...c, pasos: { ...c.pasos, items: [...c.pasos.items, { title: "Nuevo", description: "" }] } }))} />
        </Section>

        <Section
          title="Convocatoria — rechazo, comisiones y compromisos"
          hint="Reglas del proceso y letra chica."
          paths={["landing.convocatoriaPage"]}
        >
          <StrList label="08 · Causales de rechazo" items={cp.rechazo.items} onChange={(v) => setCP((c) => ({ ...c, rechazo: { ...c.rechazo, items: v } }))} />
          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">09 · Comisiones</Typography></Divider>
          <TextField size="small" label="Nota comisiones" value={cp.comisiones.note} onChange={(e) => setCP((c) => ({ ...c, comisiones: { ...c.comisiones, note: e.target.value } }))} fullWidth multiline rows={2} />
          {cp.comisiones.items.map((m, i) => (
            <Row key={i} onRemove={() => setCP((c) => ({ ...c, comisiones: { ...c.comisiones, items: c.comisiones.items.filter((_, idx) => idx !== i) } }))}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField size="small" label="Etiqueta" value={m.tag} onChange={(e) => setCP((c) => ({ ...c, comisiones: { ...c.comisiones, items: c.comisiones.items.map((x, idx) => idx === i ? { ...x, tag: e.target.value } : x) } }))} sx={{ minWidth: 160 }} />
                <TextField size="small" label="Texto" value={m.text} onChange={(e) => setCP((c) => ({ ...c, comisiones: { ...c.comisiones, items: c.comisiones.items.map((x, idx) => idx === i ? { ...x, text: e.target.value } : x) } }))} fullWidth />
              </Stack>
            </Row>
          ))}
          <AddBtn onClick={() => setCP((c) => ({ ...c, comisiones: { ...c.comisiones, items: [...c.comisiones.items, { tag: "Comisión adicional", text: "" }] } }))} />
          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">10 · Compromisos</Typography></Divider>
          <StrList label={cp.compromisos.artistaTitle} items={cp.compromisos.artista} onChange={(v) => setCP((c) => ({ ...c, compromisos: { ...c.compromisos, artista: v } }))} />
          <StrList label={cp.compromisos.feriaTitle} items={cp.compromisos.feria} onChange={(v) => setCP((c) => ({ ...c, compromisos: { ...c.compromisos, feria: v } }))} />
        </Section>

        {/* Boletín */}
        <Section
          title="Boletín (newsletter)"
          hint="Bloque de suscripción por correo."
          paths={["landing.newsletter"]}
        >
          <Stack direction="row" flexWrap="wrap" alignItems="center"><Switch checked={landing.newsletter.enabled} onChange={() => setL((l) => ({ ...l, newsletter: { ...l.newsletter, enabled: !l.newsletter.enabled } }))} color="success" /><Typography variant="body2">Mostrar sección</Typography></Stack>
          <TextField size="small" label="Badge" value={landing.newsletter.badge} onChange={(e) => setL((l) => ({ ...l, newsletter: { ...l.newsletter, badge: e.target.value } }))} fullWidth />
          <TextField size="small" label="Título" value={landing.newsletter.title} onChange={(e) => setL((l) => ({ ...l, newsletter: { ...l.newsletter, title: e.target.value } }))} fullWidth multiline rows={2} />
          <TextField size="small" label="Párrafo" value={landing.newsletter.paragraph} onChange={(e) => setL((l) => ({ ...l, newsletter: { ...l.newsletter, paragraph: e.target.value } }))} fullWidth multiline rows={2} />
          <TextField size="small" label="Nota (letra pequeña)" value={landing.newsletter.note} onChange={(e) => setL((l) => ({ ...l, newsletter: { ...l.newsletter, note: e.target.value } }))} fullWidth />
        </Section>

        {/* Footer + ajustes */}
        <Section
          title="Pie de página y ajustes"
          hint="Pie del sitio y visibilidad de precios."
          paths={["landing.footer", "landing.priceLabel", "landing.showPrices"]}
        >
          <TextField size="small" label="Descripción del footer" value={landing.footer.description} onChange={(e) => setL((l) => ({ ...l, footer: { ...l.footer, description: e.target.value } }))} fullWidth multiline rows={2} />
          <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
            <Stack direction="row" flexWrap="wrap" alignItems="center"><Switch checked={landing.showPrices} onChange={() => setL((l) => ({ ...l, showPrices: !l.showPrices }))} color="success" /><Typography variant="body2">Mostrar precios en obras</Typography></Stack>
            <TextField size="small" label="Precio de referencia" value={landing.priceLabel} onChange={(e) => setL((l) => ({ ...l, priceLabel: e.target.value }))} sx={{ minWidth: 160 }} />
          </Stack>
        </Section>

        {/* Obras destacadas (título de sección; las obras salen del catálogo) */}
        <Section
          title="Obras destacadas"
          hint="Textos de la sección de obras destacadas."
          paths={["content.featured"]}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Badge" value={content.featured.badge} onChange={(e) => setFeat("badge", e.target.value)} sx={{ minWidth: 160 }} />
            <TextField size="small" label="Título" value={content.featured.title} onChange={(e) => setFeat("title", e.target.value)} fullWidth />
          </Stack>
        </Section>
        <Section
          title="Técnicas"
          hint="Textos de la sección de técnicas."
          paths={["content.techniques"]}
        >
          <TextField size="small" label="Título" value={content.techniques.title} onChange={(e) => setTech("title", e.target.value)} fullWidth />
          <TextField size="small" label="Subtítulo" value={content.techniques.subtitle} onChange={(e) => setTech("subtitle", e.target.value)} fullWidth />
        </Section>

        {/* Contacto */}
        <Section
          title="Contacto"
          hint="Datos de contacto públicos."
          paths={["content.contact"]}
        >
          <TextField size="small" label="Badge" value={content.contact.badge} onChange={(e) => setContact("badge", e.target.value)} fullWidth />
          <TextField size="small" label="Título" value={content.contact.title} onChange={(e) => setContact("title", e.target.value)} fullWidth />
          <TextField size="small" label="Subtítulo" value={content.contact.subtitle} onChange={(e) => setContact("subtitle", e.target.value)} fullWidth multiline rows={2} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Email" value={content.contact.email} onChange={(e) => setContact("email", e.target.value)} fullWidth />
            <TextField size="small" label="Teléfono" value={content.contact.phone} onChange={(e) => setContact("phone", e.target.value)} fullWidth />
          </Stack>
        </Section>

        {/* Redes sociales */}
        <Section
          title="Redes sociales"
          hint="Enlaces a redes."
          paths={["content.social"]}
        >
          <Typography variant="caption" color="text.secondary">
            Pega el enlace completo. Vacío = no se muestra ese ícono.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Instagram" value={content.social.instagram} onChange={(e) => setSocial("instagram", e.target.value)} fullWidth placeholder="https://instagram.com/…" />
            <TextField size="small" label="Facebook" value={content.social.facebook} onChange={(e) => setSocial("facebook", e.target.value)} fullWidth placeholder="https://facebook.com/…" />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="WhatsApp" value={content.social.whatsapp} onChange={(e) => setSocial("whatsapp", e.target.value)} fullWidth placeholder="https://wa.me/57…" />
            <TextField size="small" label="YouTube" value={content.social.youtube} onChange={(e) => setSocial("youtube", e.target.value)} fullWidth placeholder="https://youtube.com/…" />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="TikTok" value={content.social.tiktok} onChange={(e) => setSocial("tiktok", e.target.value)} fullWidth placeholder="https://tiktok.com/@…" />
            <Box sx={{ flex: 1 }} />
          </Stack>
        </Section>
      </Stack>
      </PersoCtx.Provider>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <Alert severity={toast.sev} variant="filled">{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
