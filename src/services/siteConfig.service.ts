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
}

export type SectionKey =
  | "eventInfo"
  | "pavilions"
  | "featured"
  | "techniques"
  | "stats"
  | "contact";

export const SECTION_KEYS: SectionKey[] = [
  "eventInfo",
  "pavilions",
  "featured",
  "techniques",
  "stats",
  "contact",
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  eventInfo: "Info del evento",
  pavilions: "Pabellones",
  featured: "Obras destacadas",
  techniques: "Técnicas",
  stats: "Estadísticas",
  contact: "Contacto",
};

export interface SiteSections {
  order: SectionKey[];
  visible: Record<SectionKey, boolean>;
}

export interface SiteConfig {
  theme: SiteTheme;
  content: SiteContent;
  sections: SiteSections;
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
  },
  sections: {
    order: [...SECTION_KEYS],
    visible: {
      eventInfo: true,
      pavilions: true,
      featured: true,
      techniques: true,
      stats: true,
      contact: true,
    },
  },
};

export function mergeSiteConfig(raw: any): SiteConfig {
  const t = raw?.theme || {};
  const c = raw?.content || {};
  const s = raw?.sections || {};
  const D = SITE_DEFAULTS;

  const order: SectionKey[] = Array.isArray(s.order)
    ? ([...s.order.filter((k: any) => SECTION_KEYS.includes(k)),
        ...SECTION_KEYS.filter((k) => !s.order.includes(k))] as SectionKey[])
    : [...SECTION_KEYS];

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
    },
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
