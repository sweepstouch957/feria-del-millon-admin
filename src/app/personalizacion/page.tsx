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
  const setEvent = (k: keyof SiteConfig["content"]["eventInfo"], v: string) =>
    setC((ct) => ({ ...ct, eventInfo: { ...ct.eventInfo, [k]: v } }));
  const setCard = (i: number, k: "title" | "description", v: string) =>
    setC((ct) => ({ ...ct, eventCards: ct.eventCards.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)) }));
  const setPav = (k: "badge" | "title", v: string) =>
    setC((ct) => ({ ...ct, pavilions: { ...ct.pavilions, [k]: v } }));
  const setFeat = (k: "badge" | "title", v: string) =>
    setC((ct) => ({ ...ct, featured: { ...ct.featured, [k]: v } }));
  const setTech = (k: "title" | "subtitle", v: string) =>
    setC((ct) => ({ ...ct, techniques: { ...ct.techniques, [k]: v } }));
  const setStat = (i: number, k: "number" | "label" | "suffix", v: string) =>
    setC((ct) => ({ ...ct, stats: ct.stats.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)) }));
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

  const { theme, content, sections, nav } = cfg;

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

        {/* Info del evento + cards */}
        <Section title="Sección de evento">
          <TextField size="small" label="Badge" value={content.eventInfo.badge} onChange={(e) => setEvent("badge", e.target.value)} fullWidth />
          <TextField size="small" label="Título" value={content.eventInfo.title} onChange={(e) => setEvent("title", e.target.value)} fullWidth />
          <TextField size="small" label="Descripción" value={content.eventInfo.description} onChange={(e) => setEvent("description", e.target.value)} fullWidth multiline rows={2} />
          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Tarjetas (3)</Typography></Divider>
          {content.eventCards.map((card, i) => (
            <Stack key={i} direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField size="small" label={`Tarjeta ${i + 1} — título`} value={card.title} onChange={(e) => setCard(i, "title", e.target.value)} sx={{ minWidth: 180 }} />
              <TextField size="small" label="Descripción" value={card.description} onChange={(e) => setCard(i, "description", e.target.value)} fullWidth />
            </Stack>
          ))}
        </Section>

        {/* Pabellones / Obras / Técnicas */}
        <Section title="Pabellones">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Badge" value={content.pavilions.badge} onChange={(e) => setPav("badge", e.target.value)} sx={{ minWidth: 160 }} />
            <TextField size="small" label="Título" value={content.pavilions.title} onChange={(e) => setPav("title", e.target.value)} fullWidth />
          </Stack>
        </Section>
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

        {/* Stats */}
        <Section title="Estadísticas">
          <TextField size="small" label="Título de la sección" value={content.statsTitle} onChange={(e) => setC((ct) => ({ ...ct, statsTitle: e.target.value }))} fullWidth />
          {content.stats.map((s, i) => (
            <Stack key={i} direction="row" spacing={2}>
              <TextField size="small" label="Número" value={s.number} onChange={(e) => setStat(i, "number", e.target.value)} sx={{ width: 120 }} />
              <TextField size="small" label="Sufijo" value={s.suffix || ""} onChange={(e) => setStat(i, "suffix", e.target.value)} sx={{ width: 90 }} />
              <TextField size="small" label="Etiqueta" value={s.label} onChange={(e) => setStat(i, "label", e.target.value)} fullWidth />
            </Stack>
          ))}
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
