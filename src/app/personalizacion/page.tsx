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
      <Typography variant="caption" fontWeight={700} sx={{ color: "text.secondary", display: "block", mb: 0.75 }}>{label}</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box component="input" type="color" value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          sx={{ width: 44, height: 40, p: 0, border: "1px solid", borderColor: "divider", borderRadius: 1.5, cursor: "pointer", background: "none" }} />
        <TextField size="small" value={value} onChange={(e) => onChange(e.target.value)} sx={{ width: 120 }} />
      </Stack>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography fontWeight={800} fontSize={15} mb={2}>{title}</Typography>
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
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.75 }}>{label}</Typography>
      <Stack spacing={1}>
        {items.map((v, i) => (
          <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
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
    <Box sx={{ p: 1.25, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
      <Stack direction="row" spacing={1} alignItems="flex-start">
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

  React.useEffect(() => {
    getSiteConfig().then(setCfg).catch(() => setCfg(SITE_DEFAULTS)).finally(() => setLoading(false));
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

  const handleSave = async () => {
    if (!cfg) return;
    setSaving(true);
    try {
      const saved = await updateSiteConfig(cfg);
      setCfg(saved);
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

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: "auto" }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(34,197,94,0.14)", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PaletteIcon size={20} />
        </Box>
        <Box flex={1}>
          <Typography fontWeight={900} fontSize={20}>Personalización del sitio</Typography>
          <Typography variant="caption" color="text.secondary">Colores, textos, imágenes y secciones del landing</Typography>
        </Box>
        <Tooltip title="Restaurar valores por defecto">
          <IconButton onClick={() => setCfg(SITE_DEFAULTS)}><ResetIcon size={18} /></IconButton>
        </Tooltip>
        <Button variant="contained" disableElevation onClick={handleSave} disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon size={16} />}
          sx={{ fontWeight: 700, textTransform: "none", boxShadow: "none", bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d", boxShadow: "none" } }}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </Stack>

      <Stack spacing={2.5}>
        {/* Marca y SEO */}
        <Section title="Marca y SEO">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Nombre de marca (navbar)" value={content.brand.name} onChange={(e) => setBrand("name", e.target.value)} fullWidth />
            <TextField size="small" label="Tagline (navbar)" value={content.brand.tagline} onChange={(e) => setBrand("tagline", e.target.value)} fullWidth />
          </Stack>
          {/* Logo */}
          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
              Logo (opcional — vacío = ícono por defecto)
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
              {content.brand.logo ? (
                <Box sx={{ position: "relative", width: 56, height: 56, borderRadius: 1.5, overflow: "hidden", border: "1px solid", borderColor: "divider", flexShrink: 0 }}>
                  <Box component="img" src={content.brand.logo} alt="logo" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <IconButton size="small" onClick={() => setBrand("logo", "")}
                    sx={{ position: "absolute", top: 1, right: 1, bgcolor: "rgba(0,0,0,0.6)", color: "#fff", "&:hover": { bgcolor: "rgba(0,0,0,0.8)" } }}>
                    <XIcon size={11} />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ width: 56, height: 56, borderRadius: 1.5, border: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center", color: "text.disabled", flexShrink: 0 }}>
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

        {/* Tema */}
        <Section title="Tema — colores">
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
            <ColorField label="Acento de marca" value={theme.accent} onChange={(v) => setTheme("accent", v)} />
            <ColorField label="Acento oscuro" value={theme.accentDark} onChange={(v) => setTheme("accentDark", v)} />
            <Box />
            <ColorField label="Hero — color 1" value={theme.heroFrom} onChange={(v) => setTheme("heroFrom", v)} />
            <ColorField label="Hero — color 2" value={theme.heroVia} onChange={(v) => setTheme("heroVia", v)} />
            <ColorField label="Hero — color 3" value={theme.heroTo} onChange={(v) => setTheme("heroTo", v)} />
          </Box>
          <Divider />
          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary">Vista previa del hero</Typography>
            <Box sx={{
              mt: 1, height: 90, borderRadius: 2, border: "1px solid", borderColor: "divider",
              backgroundImage: content.hero.image
                ? `linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.55)), url(${content.hero.image})`
                : `linear-gradient(to bottom right, ${theme.heroFrom}, ${theme.heroVia}, ${theme.heroTo})`,
              backgroundSize: "cover", backgroundPosition: "center",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Typography sx={{ color: "#fff", fontWeight: 800 }}>{content.hero.title}</Typography>
            </Box>
          </Box>
        </Section>

        {/* Secciones: orden + visibilidad */}
        <Section title="Secciones — orden y visibilidad">
          <Typography variant="caption" color="text.secondary">
            Reordena con las flechas y muestra/oculta con el interruptor. El Hero (portada) siempre va primero.
          </Typography>
          <Stack spacing={1}>
            {sections.order.map((k, i) => (
              <Stack key={k} direction="row" alignItems="center" spacing={1}
                sx={{ p: 1, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Stack>
                  <IconButton size="small" disabled={i === 0} onClick={() => moveSection(i, -1)}><ChevronUp size={16} /></IconButton>
                  <IconButton size="small" disabled={i === sections.order.length - 1} onClick={() => moveSection(i, 1)}><ChevronDown size={16} /></IconButton>
                </Stack>
                <Typography flex={1} fontWeight={700} fontSize={14} sx={{ opacity: sections.visible[k] ? 1 : 0.5 }}>
                  {SECTION_LABELS[k]}
                </Typography>
                {sections.visible[k] ? <Eye size={16} /> : <EyeOff size={16} color="#94a3b8" />}
                <Switch checked={sections.visible[k]} onChange={() => toggleVisible(k)} size="small" />
              </Stack>
            ))}
          </Stack>
        </Section>

        {/* Navbar — pestañas configurables */}
        <Section title="Navbar — pestañas del menú">
          <Stack direction="row" spacing={1} alignItems="center">
            <MenuIcon size={16} />
            <Typography variant="caption" color="text.secondary">
              <b>Mostrar</b> = aparece en el menú. <b>Habilitada</b> = clickable (apagada = se ve en gris como “Próximamente”). Reordena con las flechas.
            </Typography>
          </Stack>
          <Stack spacing={1}>
            {nav.items.map((it, i) => (
              <Box key={i} sx={{ p: 1.25, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                  <Stack>
                    <IconButton size="small" disabled={i === 0} onClick={() => moveNav(i, -1)}><ChevronUp size={15} /></IconButton>
                    <IconButton size="small" disabled={i === nav.items.length - 1} onClick={() => moveNav(i, 1)}><ChevronDown size={15} /></IconButton>
                  </Stack>
                  <TextField size="small" label="Texto" value={it.label} onChange={(e) => setNavItem(i, "label", e.target.value)} sx={{ minWidth: 140 }} />
                  <TextField size="small" label="Ruta (href)" value={it.href} onChange={(e) => setNavItem(i, "href", e.target.value)} fullWidth placeholder="/catalogo" />
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Tooltip title={it.visible ? "Se muestra" : "Oculta"}>
                      <Stack alignItems="center" spacing={0}>
                        {it.visible ? <Eye size={15} /> : <EyeOff size={15} color="#94a3b8" />}
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
        <Section title="Portada (hero)">
          <TextField size="small" label="Badge" value={content.hero.badge} onChange={(e) => setHero("badge", e.target.value)} fullWidth />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Título" value={content.hero.title} onChange={(e) => setHero("title", e.target.value)} fullWidth />
            <TextField size="small" label="Subtítulo" value={content.hero.subtitle} onChange={(e) => setHero("subtitle", e.target.value)} fullWidth />
          </Stack>
          <TextField size="small" label="Párrafo" value={content.hero.paragraph} onChange={(e) => setHero("paragraph", e.target.value)} fullWidth multiline rows={3} />

          {/* Imagen de fondo: subir o pegar URL. Vacío = usar gradiente. */}
          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
              Imagen de fondo del hero (opcional — vacío = gradiente)
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
              {content.hero.image ? (
                <Box sx={{ position: "relative", width: 120, height: 68, borderRadius: 1.5, overflow: "hidden", border: "1px solid", borderColor: "divider", flexShrink: 0 }}>
                  <Box component="img" src={content.hero.image} alt="hero" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <IconButton size="small" onClick={() => setHero("image", "")}
                    sx={{ position: "absolute", top: 2, right: 2, bgcolor: "rgba(0,0,0,0.6)", color: "#fff", "&:hover": { bgcolor: "rgba(0,0,0,0.8)" } }}>
                    <XIcon size={12} />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ width: 120, height: 68, borderRadius: 1.5, border: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center", color: "text.disabled", flexShrink: 0 }}>
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
        <Divider textAlign="left"><Typography variant="overline" fontWeight={800} color="text.secondary">Contenido del landing</Typography></Divider>

        {/* Hero — barra y datos */}
        <Section title="Portada — barra superior y datos">
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
        <Section title="Ticker (cinta que se desliza)">
          <Stack direction="row" spacing={2} alignItems="center">
            <Stack direction="row" alignItems="center"><Switch checked={landing.showTicker} onChange={() => setL((l) => ({ ...l, showTicker: !l.showTicker }))} /><Typography variant="body2">Mostrar ticker</Typography></Stack>
          </Stack>
          <StrList label="Palabras / frases del ticker" items={landing.ticker.items} onChange={(items) => setL((l) => ({ ...l, ticker: { ...l.ticker, items } }))} placeholder="Pintura" />
        </Section>

        {/* La feria (about) */}
        <Section title="La feria (intro + estadísticas)">
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
                <Stack direction="row" alignItems="center"><Switch size="small" color="success" checked={!!s.accent} onChange={() => setL((l) => ({ ...l, about: { ...l.about, stats: l.about.stats.map((x, idx) => (idx === i ? { ...x, accent: !x.accent } : x)) } }))} /><Typography variant="caption">Verde</Typography></Stack>
              </Stack>
            </Row>
          ))}
          <AddBtn onClick={() => setL((l) => ({ ...l, about: { ...l.about, stats: [...l.about.stats, { value: "", label: "Nuevo" }] } }))} />
        </Section>

        {/* Técnicas — tarjetas */}
        <Section title="Técnicas — tarjetas (imagen + nombre)">
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
        <Section title="Sedes">
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
                <Stack direction="row" alignItems="center"><Switch size="small" color="success" checked={!!s.highlight} onChange={() => setL((l) => ({ ...l, sedes: { ...l.sedes, items: l.sedes.items.map((x, idx) => (idx === i ? { ...x, highlight: !x.highlight } : x)) } }))} /><Typography variant="caption">Destacar</Typography></Stack>
              </Stack>
            </Row>
          ))}
          <AddBtn onClick={() => setL((l) => ({ ...l, sedes: { ...l.sedes, items: [...l.sedes.items, { name: "Nueva", tag: "Sede" }] } }))} />
        </Section>

        {/* Programas */}
        <Section title="Programas">
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
        <Section title="Convocatoria">
          <Stack direction="row" alignItems="center"><Switch checked={landing.convocatoria.open} onChange={() => setL((l) => ({ ...l, convocatoria: { ...l.convocatoria, open: !l.convocatoria.open } }))} color="success" /><Typography variant="body2">Convocatoria abierta (apagado = se oculta la sección)</Typography></Stack>
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

        {/* Boletín */}
        <Section title="Boletín (newsletter)">
          <Stack direction="row" alignItems="center"><Switch checked={landing.newsletter.enabled} onChange={() => setL((l) => ({ ...l, newsletter: { ...l.newsletter, enabled: !l.newsletter.enabled } }))} color="success" /><Typography variant="body2">Mostrar sección</Typography></Stack>
          <TextField size="small" label="Badge" value={landing.newsletter.badge} onChange={(e) => setL((l) => ({ ...l, newsletter: { ...l.newsletter, badge: e.target.value } }))} fullWidth />
          <TextField size="small" label="Título" value={landing.newsletter.title} onChange={(e) => setL((l) => ({ ...l, newsletter: { ...l.newsletter, title: e.target.value } }))} fullWidth multiline rows={2} />
          <TextField size="small" label="Párrafo" value={landing.newsletter.paragraph} onChange={(e) => setL((l) => ({ ...l, newsletter: { ...l.newsletter, paragraph: e.target.value } }))} fullWidth multiline rows={2} />
          <TextField size="small" label="Nota (letra pequeña)" value={landing.newsletter.note} onChange={(e) => setL((l) => ({ ...l, newsletter: { ...l.newsletter, note: e.target.value } }))} fullWidth />
        </Section>

        {/* Footer + ajustes */}
        <Section title="Pie de página y ajustes">
          <TextField size="small" label="Descripción del footer" value={landing.footer.description} onChange={(e) => setL((l) => ({ ...l, footer: { ...l.footer, description: e.target.value } }))} fullWidth multiline rows={2} />
          <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
            <Stack direction="row" alignItems="center"><Switch checked={landing.showPrices} onChange={() => setL((l) => ({ ...l, showPrices: !l.showPrices }))} color="success" /><Typography variant="body2">Mostrar precios en obras</Typography></Stack>
            <TextField size="small" label="Precio de referencia" value={landing.priceLabel} onChange={(e) => setL((l) => ({ ...l, priceLabel: e.target.value }))} sx={{ minWidth: 160 }} />
          </Stack>
        </Section>

        {/* Obras destacadas (título de sección; las obras salen del catálogo) */}
        <Section title="Obras destacadas">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Badge" value={content.featured.badge} onChange={(e) => setFeat("badge", e.target.value)} sx={{ minWidth: 160 }} />
            <TextField size="small" label="Título" value={content.featured.title} onChange={(e) => setFeat("title", e.target.value)} fullWidth />
          </Stack>
        </Section>
        <Section title="Técnicas">
          <TextField size="small" label="Título" value={content.techniques.title} onChange={(e) => setTech("title", e.target.value)} fullWidth />
          <TextField size="small" label="Subtítulo" value={content.techniques.subtitle} onChange={(e) => setTech("subtitle", e.target.value)} fullWidth />
        </Section>

        {/* Contacto */}
        <Section title="Contacto">
          <TextField size="small" label="Badge" value={content.contact.badge} onChange={(e) => setContact("badge", e.target.value)} fullWidth />
          <TextField size="small" label="Título" value={content.contact.title} onChange={(e) => setContact("title", e.target.value)} fullWidth />
          <TextField size="small" label="Subtítulo" value={content.contact.subtitle} onChange={(e) => setContact("subtitle", e.target.value)} fullWidth multiline rows={2} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Email" value={content.contact.email} onChange={(e) => setContact("email", e.target.value)} fullWidth />
            <TextField size="small" label="Teléfono" value={content.contact.phone} onChange={(e) => setContact("phone", e.target.value)} fullWidth />
          </Stack>
        </Section>

        {/* Redes sociales */}
        <Section title="Redes sociales">
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
        </Section>
      </Stack>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <Alert severity={toast.sev} variant="filled">{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
