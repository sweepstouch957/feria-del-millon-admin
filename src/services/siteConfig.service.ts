import apiClient from "@/axios";

export interface SiteTheme {
  accent: string;
  accentDark: string;
  heroFrom: string;
  heroVia: string;
  heroTo: string;
  bg?: string;
  fg?: string;
  panel?: string;
  greenDeep?: string;
  onDark?: string;
}

export interface SiteStat {
  number: string;
  label: string;
  suffix?: string;
}

export interface SiteCard {
  title: string;
  description: string;
}

export interface SiteContent {
  brand: { name: string; tagline: string; logo: string };
  seo: { title: string; description: string };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    paragraph: string;
    ctaPrimaryLabel: string;
    ctaSecondaryLabel: string;
    ticketsLabel: string;
    image: string;
  };
  eventInfo: { badge: string; title: string; description: string };
  eventCards: SiteCard[];
  pavilions: { badge: string; title: string };
  featured: { badge: string; title: string };
  techniques: { title: string; subtitle: string };
  statsTitle: string;
  stats: SiteStat[];
  contact: { badge: string; title: string; subtitle: string; email: string; phone: string };
  social: { instagram: string; facebook: string; whatsapp: string; youtube: string };
}

// Navbar configurable: cada pestaña puede mostrarse/ocultarse y habilitarse.
export interface NavItem {
  label: string;
  href: string;
  visible: boolean;
  enabled: boolean;
}

export const DEFAULT_NAV: NavItem[] = [
  { label: "Inicio", href: "/", visible: true, enabled: true },
  { label: "Catálogo", href: "/catalogo", visible: true, enabled: true },
  { label: "Tickets", href: "/tickets", visible: true, enabled: true },
  { label: "Artistas", href: "/artistas", visible: true, enabled: true },
  { label: "Convocatoria", href: "/convocatoria", visible: true, enabled: true },
  { label: "Sobre Nosotros", href: "/sobre-nosotros", visible: true, enabled: true },
];

// ── Bloques del landing v2 (deben coincidir con el ecommerce) ──────────────
export interface LandingHeroStat { label: string; value: string }
export interface LandingAboutStat { value: string; label: string; accent?: boolean }
export interface LandingTechniqueItem { name: string; image: string; href: string }
export interface LandingSede { name: string; tag: string; highlight?: boolean }
export interface LandingProgram { title: string; description: string; href: string }

export interface LandingConfig {
  heroMeta: { edition: string; location: string; year: string; stats: LandingHeroStat[] };
  ticker: { enabled: boolean; items: string[] };
  about: { badge: string; title: string; paragraphs: string[]; ctaLabel: string; ctaHref: string; stats: LandingAboutStat[] };
  techniqueItems: LandingTechniqueItem[];
  sedes: { badge: string; title: string; subtitle: string; items: LandingSede[] };
  programs: { badge: string; title: string; items: LandingProgram[] };
  convocatoria: {
    badge: string; title: string; titleAccent: string; open: boolean;
    openDate: string; closeDate: string; paragraph: string;
    ctaPrimaryLabel: string; ctaSecondaryLabel: string; primaryHref: string; secondaryHref: string;
  };
  newsletter: { badge: string; title: string; paragraph: string; note: string; enabled: boolean };
  footer: { description: string };
  showTicker: boolean;
  showPrices: boolean;
  priceLabel: string;
}

export const LANDING_DEFAULTS: LandingConfig = {
  heroMeta: {
    edition: "Edición 14",
    location: "Bogotá — Colombia",
    year: "2026",
    stats: [
      { label: "Convocatoria", value: "29 abril — 20 julio 2026" },
      { label: "Sede", value: "Bogotá, por anunciar" },
      { label: "Obras desde", value: "$1.000.000 COP" },
      { label: "Desde", value: "2012 · 13 ediciones" },
    ],
  },
  ticker: {
    enabled: true,
    items: ["Convocatoria 2026 abierta", "Pintura", "Fotografía", "Obra gráfica", "Escultura", "Dibujo", "Arte digital"],
  },
  about: {
    badge: "La feria",
    title: "Un millón de pesos alcanza para empezar una colección.",
    paragraphs: [
      "Desde 2012 la Feria del Millón abre el mercado del arte a una generación nueva: artistas que exponen por primera vez y compradores que adquieren su primera obra. Pintura, fotografía, obra gráfica, escultura y práctica digital, con precios claros y sin intermediarios.",
      "La edición 2026 llega a Bogotá con un pabellón curado, programa de mentores, galería virtual y convocatoria abierta a todo el país.",
    ],
    ctaLabel: "Recorrer el pabellón →",
    ctaHref: "/catalogo",
    stats: [
      { value: "14", label: "Ediciones" },
      { value: "500", label: "Artistas" },
      { value: "2000", label: "Obras exhibidas" },
      { value: "6", label: "Sedes", accent: true },
    ],
  },
  techniqueItems: [
    { name: "Pintura", image: "/assets/fdm/tec-pintura.png", href: "/catalogo?tecnica=pintura" },
    { name: "Fotografía", image: "/assets/fdm/tec-fotografia.png", href: "/catalogo?tecnica=fotografia" },
    { name: "Dibujo", image: "/assets/fdm/tec-dibujo.png", href: "/catalogo?tecnica=dibujo" },
    { name: "Grabado", image: "/assets/fdm/tec-grabado.png", href: "/catalogo?tecnica=grabado" },
    { name: "Mixta", image: "/assets/fdm/tec-mixta.png", href: "/catalogo?tecnica=mixta" },
    { name: "Otras técnicas", image: "/assets/fdm/tec-otras.png", href: "/catalogo?tecnica=otras" },
  ],
  sedes: {
    badge: "Sedes",
    title: "La feria recorre el país",
    subtitle: "Cada sede tiene su propia convocatoria, su curaduría y su público.",
    items: [
      { name: "Bogotá", tag: "Edición principal", highlight: true },
      { name: "Medellín", tag: "Sede" },
      { name: "Cali", tag: "Sede" },
      { name: "Caribe", tag: "Sede" },
      { name: "México", tag: "Internacional" },
      { name: "Silla Vacía", tag: "Programa" },
    ],
  },
  programs: {
    badge: "Programas",
    title: "Más allá de la feria",
    items: [
      { title: "1K Art Show", description: "Muestra internacional de obra con precio único, pensada para nuevos coleccionistas.", href: "#" },
      { title: "Taller Mentores", description: "Acompañamiento de artistas y curadores a la obra de quienes se están formando.", href: "#" },
      { title: "Galería virtual", description: "El catálogo completo disponible todo el año, con compra en línea y envío.", href: "/catalogo" },
      { title: "Archivo", description: "Trece ediciones documentadas: artistas, obras y curadurías de cada año.", href: "#" },
    ],
  },
  convocatoria: {
    badge: "Convocatoria abierta",
    title: "Postula",
    titleAccent: "tu obra",
    open: true,
    openDate: "29 abril 2026",
    closeDate: "20 julio 2026",
    paragraph: "Artistas de cualquier ciudad de Colombia pueden aplicar a la edición 2026 de Bogotá. Selección por comité curatorial.",
    ctaPrimaryLabel: "Aplicar ahora",
    ctaSecondaryLabel: "Ver bases",
    primaryHref: "/convocatoria/aplicar",
    secondaryHref: "/convocatoria",
  },
  newsletter: {
    badge: "Boletín",
    title: "Entérate primero de la convocatoria y las fechas",
    paragraph: "Un correo por mes: apertura de convocatoria, preventa de boletas y nuevas obras del catálogo.",
    note: "Sin spam. Puedes darte de baja en cualquier momento.",
    enabled: true,
  },
  footer: { description: "La feria de arte emergente más importante de Latinoamérica." },
  showTicker: true,
  showPrices: true,
  priceLabel: "$1.000.000",
};

// Secciones del landing v2 (deben coincidir con el ecommerce).
export type SectionKey =
  | "about"
  | "featured"
  | "techniques"
  | "sedes"
  | "programs"
  | "convocatoria"
  | "newsletter";

export const SECTION_KEYS: SectionKey[] = [
  "about",
  "featured",
  "techniques",
  "sedes",
  "programs",
  "convocatoria",
  "newsletter",
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  about: "La feria (intro + stats)",
  featured: "Obras destacadas",
  techniques: "Técnicas",
  sedes: "Sedes",
  programs: "Programas",
  convocatoria: "Convocatoria",
  newsletter: "Boletín",
};

export interface SiteSections {
  order: SectionKey[];
  visible: Record<SectionKey, boolean>;
}

export interface SiteConfig {
  theme: SiteTheme;
  content: SiteContent;
  landing: LandingConfig;
  nav: { items: NavItem[] };
  sections: SiteSections;
}

export const SITE_DEFAULTS: SiteConfig = {
  theme: {
    accent: "#3FA46E",
    accentDark: "#14513C",
    heroFrom: "#0B0B0A",
    heroVia: "#0B0B0A",
    heroTo: "#0B0B0A",
    bg: "#F7F6F2",
    fg: "#0B0B0A",
    panel: "#0B0B0A",
    greenDeep: "#14513C",
    onDark: "#F5F4EF",
  },
  content: {
    brand: { name: "Feria del Millón", tagline: "Arte emergente · Bogotá 2026", logo: "" },
    seo: {
      title: "Feria del Millón 2026 — Arte emergente en Bogotá, Colombia",
      description: "Feria del Millón 2026: la feria de arte emergente más importante de Latinoamérica.",
    },
    hero: {
      badge: "Edición 14 · 2026",
      title: "Feria del Millón",
      subtitle: "Arte emergente · Bogotá 2026",
      paragraph:
        "La feria de arte emergente más importante de Latinoamérica. Obras de artistas jóvenes alrededor de un millón de pesos, al alcance de quien empieza a coleccionar.",
      ctaPrimaryLabel: "Comprar tickets",
      ctaSecondaryLabel: "Ver catálogo",
      ticketsLabel: "Tickets",
      image: "",
    },
    eventInfo: {
      badge: "Evento Destacado",
      title: "Feria del Millón 2026 — Bogotá",
      description: "La plataforma más importante de arte emergente en Colombia.",
    },
    eventCards: [
      { title: "2026", description: "Una semana completa dedicada al arte contemporáneo colombiano" },
      { title: "Bogotá, Colombia", description: "Celebrando la diversidad y riqueza del arte nacional" },
      { title: "22+ Artistas", description: "Talentos emergentes y establecidos en diversas disciplinas" },
    ],
    pavilions: { badge: "Pabellones", title: "Recorre nuestro pabellón" },
    featured: { badge: "Selección curada", title: "Obras destacadas" },
    techniques: { title: "Explora por disciplina", subtitle: "Descubre obras organizadas por técnica y medio" },
    statsTitle: "Impacto y Reconocimiento",
    stats: [
      { number: "14", label: "Años de Trayectoria", suffix: "+" },
      { number: "500", label: "Artistas Participantes", suffix: "+" },
      { number: "2000", label: "Obras Exhibidas", suffix: "+" },
      { number: "50", label: "Ciudades Alcanzadas", suffix: "+" },
    ],
    contact: {
      badge: "Estamos aquí para ayudarte",
      title: "¿Tienes preguntas?",
      subtitle: "Contáctanos para más información sobre las obras, los artistas o el proceso de compra",
      email: "coordinaciongeneral@feriadelmillon.com",
      phone: "+57 322 700 8576",
    },
    social: { instagram: "", facebook: "", whatsapp: "", youtube: "" },
  },
  landing: LANDING_DEFAULTS,
  nav: { items: [...DEFAULT_NAV] },
  sections: {
    order: [...SECTION_KEYS],
    visible: {
      about: true,
      featured: true,
      techniques: true,
      sedes: true,
      programs: true,
      convocatoria: true,
      newsletter: true,
    },
  },
};

function arr<T>(v: any, fallback: T[]): T[] {
  return Array.isArray(v) && v.length > 0 ? v : fallback;
}

function mergeLanding(l: any): LandingConfig {
  const D = LANDING_DEFAULTS;
  l = l || {};
  return {
    heroMeta: { ...D.heroMeta, ...(l.heroMeta || {}), stats: arr(l.heroMeta?.stats, D.heroMeta.stats) },
    ticker: { enabled: l.ticker?.enabled ?? D.ticker.enabled, items: arr(l.ticker?.items, D.ticker.items) },
    about: { ...D.about, ...(l.about || {}), paragraphs: arr(l.about?.paragraphs, D.about.paragraphs), stats: arr(l.about?.stats, D.about.stats) },
    techniqueItems: arr(l.techniqueItems, D.techniqueItems),
    sedes: { ...D.sedes, ...(l.sedes || {}), items: arr(l.sedes?.items, D.sedes.items) },
    programs: { ...D.programs, ...(l.programs || {}), items: arr(l.programs?.items, D.programs.items) },
    convocatoria: { ...D.convocatoria, ...(l.convocatoria || {}) },
    newsletter: { ...D.newsletter, ...(l.newsletter || {}) },
    footer: { ...D.footer, ...(l.footer || {}) },
    showTicker: l.showTicker ?? D.showTicker,
    showPrices: l.showPrices ?? D.showPrices,
    priceLabel: l.priceLabel || D.priceLabel,
  };
}

export function mergeSiteConfig(raw: any): SiteConfig {
  const t = raw?.theme || {};
  const c = raw?.content || {};
  const s = raw?.sections || {};
  const n = raw?.nav || {};
  const D = SITE_DEFAULTS;

  const order: SectionKey[] = Array.isArray(s.order)
    ? ([...s.order.filter((k: any) => SECTION_KEYS.includes(k)),
        ...SECTION_KEYS.filter((k) => !s.order.includes(k))] as SectionKey[])
    : [...SECTION_KEYS];

  const navItems: NavItem[] =
    Array.isArray(n.items) && n.items.length > 0
      ? n.items
          .filter((i: any) => i && typeof i.href === "string" && typeof i.label === "string")
          .map((i: any) => ({ label: String(i.label), href: String(i.href), visible: i.visible ?? true, enabled: i.enabled ?? true }))
      : [...DEFAULT_NAV];

  return {
    theme: { ...D.theme, ...t },
    content: {
      brand: { ...D.content.brand, ...(c.brand || {}) },
      seo: { ...D.content.seo, ...(c.seo || {}) },
      hero: { ...D.content.hero, ...(c.hero || {}) },
      eventInfo: { ...D.content.eventInfo, ...(c.eventInfo || {}) },
      eventCards: arr(c.eventCards, D.content.eventCards),
      pavilions: { ...D.content.pavilions, ...(c.pavilions || {}) },
      featured: { ...D.content.featured, ...(c.featured || {}) },
      techniques: { ...D.content.techniques, ...(c.techniques || {}) },
      statsTitle: c.statsTitle || D.content.statsTitle,
      stats: arr(c.stats, D.content.stats),
      contact: { ...D.content.contact, ...(c.contact || {}) },
      social: { ...D.content.social, ...(c.social || {}) },
    },
    landing: mergeLanding(raw?.landing),
    nav: { items: navItems },
    sections: { order, visible: { ...D.sections.visible, ...(s.visible || {}) } },
  };
}

// GET /event/site-config (público)
export const getSiteConfig = async (): Promise<SiteConfig> => {
  const { data } = await apiClient.get("/event/site-config", { withCredentials: true });
  return mergeSiteConfig(data);
};

// PATCH /event/site-config (staff)
export const updateSiteConfig = async (payload: SiteConfig): Promise<SiteConfig> => {
  const { data } = await apiClient.patch("/event/site-config", payload, { withCredentials: true });
  return mergeSiteConfig(data);
};
