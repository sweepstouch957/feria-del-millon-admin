import apiClient from "@/axios";

export interface SiteTheme {
  accent: string;
  accentDark: string;
  heroFrom: string;
  heroVia: string;
  heroTo: string;
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
  sections: SiteSections;
  nav: { items: NavItem[] };
  // Bloques del landing v2 (copys de about/sedes/programs/convocatoria/etc).
  // Passthrough: se conserva tal cual para no perderlo al guardar.
  landing?: Record<string, unknown>;
}

export const SITE_DEFAULTS: SiteConfig = {
  theme: {
    accent: "#22c55e",
    accentDark: "#16a34a",
    heroFrom: "#000000",
    heroVia: "#0a0a0a",
    heroTo: "#000000",
  },
  content: {
    brand: {
      name: "Feria del Millón 2026",
      tagline: "2026 • Feria del Millón 14",
      logo: "",
    },
    seo: {
      title: "Semana del Arte",
      description: "Feria del Millón - Tienda y Panel de Artistas",
    },
    hero: {
      badge: "14ª Edición • 2026",
      title: "Feria del Millón",
      subtitle: "Feria del Millón 2026",
      paragraph:
        "Descubre la colección más extraordinaria de arte contemporáneo colombiano — una experiencia que conecta artistas emergentes con coleccionistas apasionados, ahora en Bogotá.",
      ctaPrimaryLabel: "Explorar Catálogo",
      ctaSecondaryLabel: "Conocer Artistas",
      ticketsLabel: "Comprar tickets · 2026",
      image: "",
    },
    eventInfo: {
      badge: "Evento Destacado",
      title: "Feria del Millón 2026 — Bogotá",
      description:
        "La plataforma más importante de arte emergente en Colombia, reuniendo a los talentos más prometedores del panorama artístico nacional.",
    },
    eventCards: [
      { title: "2026", description: "Una semana completa dedicada al arte contemporáneo colombiano" },
      { title: "Bogotá, Colombia", description: "Celebrando la diversidad y riqueza del arte nacional" },
      { title: "22+ Artistas", description: "Talentos emergentes y establecidos en diversas disciplinas" },
    ],
    pavilions: { badge: "Pabellones", title: "Recorre nuestro pabellón" },
    featured: { badge: "Selección Curada", title: "Obras destacadas" },
    techniques: {
      title: "Explora por Técnicas",
      subtitle: "Descubre obras organizadas por disciplinas y medios",
    },
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
      subtitle:
        "Contáctanos para más información sobre las obras, los artistas o el proceso de compra",
      email: "coordinaciongeneral@feriadelmillon.com",
      phone: "+(57) 322 700 85 76",
    },
    social: { instagram: "", facebook: "", whatsapp: "", youtube: "" },
  },
  nav: { items: [...DEFAULT_NAV] },
  landing: {},
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
          .map((i: any) => ({
            label: String(i.label),
            href: String(i.href),
            visible: i.visible ?? true,
            enabled: i.enabled ?? true,
          }))
      : [...DEFAULT_NAV];

  return {
    theme: { ...D.theme, ...t },
    content: {
      brand: { ...D.content.brand, ...(c.brand || {}) },
      seo: { ...D.content.seo, ...(c.seo || {}) },
      hero: { ...D.content.hero, ...(c.hero || {}) },
      eventInfo: { ...D.content.eventInfo, ...(c.eventInfo || {}) },
      eventCards:
        Array.isArray(c.eventCards) && c.eventCards.length > 0 ? c.eventCards : D.content.eventCards,
      pavilions: { ...D.content.pavilions, ...(c.pavilions || {}) },
      featured: { ...D.content.featured, ...(c.featured || {}) },
      techniques: { ...D.content.techniques, ...(c.techniques || {}) },
      statsTitle: c.statsTitle || D.content.statsTitle,
      stats: Array.isArray(c.stats) && c.stats.length > 0 ? c.stats : D.content.stats,
      contact: { ...D.content.contact, ...(c.contact || {}) },
      social: { ...D.content.social, ...(c.social || {}) },
    },
    nav: { items: navItems },
    // Passthrough: preservamos el bloque landing v2 sin tocarlo.
    landing: raw?.landing && typeof raw.landing === "object" ? raw.landing : {},
    sections: {
      order,
      visible: { ...D.sections.visible, ...(s.visible || {}) },
    },
  };
}

// GET /event/site-config (público)
export const getSiteConfig = async (): Promise<SiteConfig> => {
  const { data } = await apiClient.get("/event/site-config", { withCredentials: true });
  return mergeSiteConfig(data);
};

// PATCH /event/site-config (staff)
export const updateSiteConfig = async (payload: SiteConfig): Promise<SiteConfig> => {
  const { data } = await apiClient.patch("/event/site-config", payload, {
    withCredentials: true,
  });
  return mergeSiteConfig(data);
};
