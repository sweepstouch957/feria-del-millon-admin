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
  social: { instagram: string; facebook: string; whatsapp: string; youtube: string; tiktok: string };
}

// Navbar configurable: cada pestaña puede mostrarse/ocultarse y habilitarse.
export interface NavItem {
  label: string;
  href: string;
  visible: boolean;
  enabled: boolean;
}

export const DEFAULT_NAV: NavItem[] = [
  { label: "Catálogo", href: "/catalogo", visible: true, enabled: true },
  { label: "Técnicas", href: "/#tecnicas", visible: true, enabled: true },
  { label: "Sedes", href: "/#ciudades", visible: true, enabled: true },
  { label: "Programas", href: "/#programas", visible: true, enabled: true },
  { label: "Convocatoria", href: "/convocatoria", visible: true, enabled: true },
  { label: "La feria", href: "/#feria", visible: true, enabled: true },
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
  convocatoriaPage: ConvocatoriaPage;
}

// ── Página de convocatoria (bases) — espejo del ecommerce ──────────────────
export interface ConvStat { value: string; label: string; accent?: boolean }
export interface ConvDoc { title: string; spec: string }
export interface ConvStep { title: string; description: string }
export interface ConvComision { tag: string; text: string }
export interface ConvWhen { label: string; value: string }

export interface ConvocatoriaPage {
  hero: { badgeLeft: string; badgeCenter: string; badgeRight: string; title: string; titleStrong: string; year: string; paragraph: string; ctaPrimary: string; ctaSecondary: string };
  dates: { openLabel: string; openValue: string; seleccionValue: string; eventoValue: string };
  contactEmails: string[];
  stats: ConvStat[];
  closed: { title: string; message: string };
  intro: { badge: string; title: string; titleStrong: string; paragraphs: string[] };
  impacto: { badge: string; title: string; titleStrong: string; items: string[]; note: string };
  cronograma: { badge: string; title: string; titleStrong: string; cuando: ConvWhen[]; plataformaUrl: string };
  participantes: { badge: string; title: string; titleStrong: string; noTitle: string; no: string[]; siTitle: string; si: string[] };
  requisitos: { badge: string; title: string; titleStrong: string; noTitle: string; no: string[]; siTitle: string; si: string[] };
  documentos: { badge: string; title: string; titleStrong: string; note: string; items: ConvDoc[] };
  pasos: { badge: string; title: string; titleStrong: string; items: ConvStep[] };
  rechazo: { badge: string; title: string; titleStrong: string; items: string[] };
  comisiones: { badge: string; title: string; note: string; items: ConvComision[] };
  compromisos: { badge: string; title: string; titleStrong: string; artistaTitle: string; artista: string[]; feriaTitle: string; feria: string[] };
  cta: { badge: string; title: string; titleStrong: string; paragraph: string; note: string; ctaPrimary: string; ctaSecondary: string };
  footerDescription: string;
}

export const CONVOCATORIA_PAGE_DEFAULTS: ConvocatoriaPage = {
  hero: { badgeLeft: "Convocatoria principal", badgeCenter: "Feria del Millón 2026", badgeRight: "Bogotá · Colombia", title: "Feria del", titleStrong: "Millón", year: "2026", paragraph: "Bogotá · Edición 2026 · Postula tu proyecto artístico y sé parte del evento de arte más inclusivo de Colombia", ctaPrimary: "Postular ahora →", ctaSecondary: "Ver requisitos" },
  dates: { openLabel: "Convocatoria abierta", openValue: "29 de abril — 02 de agosto de 2026 (17:59)", seleccionValue: "Mes de agosto", eventoValue: "Septiembre 2026" },
  contactEmails: ["convocatorias@feriadelmillon.com", "info@feriadelmillon.com"],
  stats: [
    { value: "500+", label: "Artistas" }, { value: "8", label: "Salones" }, { value: "3", label: "Días" }, { value: "$40K", label: "Inscripción COP", accent: true },
  ],
  closed: { title: "Convocatoria cerrada", message: "La convocatoria 2026 ya cerró. Gracias a todos los artistas que postularon. Déjanos tu correo en el boletín para enterarte primero de la próxima edición." },
  intro: { badge: "La feria", title: "¿Qué es la", titleStrong: "Feria del Millón?", paragraphs: ["Feria de arte donde se le da la oportunidad a artistas emergentes de exponer su trabajo.", "Se busca impulsar artistas en Colombia, consiguiendo visitas masivas, abriendo el mercado a otros públicos con obras alrededor del millón de pesos, llegando a espacios olvidados u obsoletos en la ciudad."] },
  impacto: { badge: "Impacto", title: "Nuestro", titleStrong: "impacto", items: ["años trabajando por el arte emergente", "obras vendidas", "artistas participantes", "aplicaciones recibidas", "compradores en base de datos", "eventos de arte"], note: "Trece ediciones de trabajo con artistas emergentes en Colombia, con obras alrededor del millón de pesos y públicos nuevos en cada sede." },
  cronograma: { badge: "Cronograma", title: "Cronograma y", titleStrong: "contacto", cuando: [{ label: "Convocatoria abierta", value: "29 de abril - 02 de agosto de 2026 (17:59)" }, { label: "Selección de artistas", value: "Mes de agosto" }, { label: "Evento", value: "Septiembre 2026" }], plataformaUrl: "/convocatoria/aplicar" },
  participantes: { badge: "Elegibilidad", title: "¿Quién puede", titleStrong: "participar?", noTitle: "No pueden participar", no: ["Galerías", "Espacios de arte"], siTitle: "Pueden participar", si: ["Cualquier persona mayor de edad (Colombiano o Extranjero)", "Colectivo o artista individual"] },
  requisitos: { badge: "Proyecto", title: "Requisitos del", titleStrong: "proyecto", noTitle: "No se puede participar con", no: ["Portafolio", "Compilado de obras aleatorias"], siTitle: "Se puede participar con", si: ["Proyecto (Serie o grupo de obras)", "Obras de valor: $800.000 a $2.500.000 COP", "Técnicas: Pintura, dibujo, acuarela, escultura, textil, gráfica, fotografía, collage, mixta, objeto"] },
  documentos: { badge: "Requisitos", title: "Documentos", titleStrong: "requeridos", note: "Ten todo listo antes de abrir el formulario: la postulación se completa en una sola sesión.", items: [{ title: "CV del artista", spec: "PDF · máx. 2MB" }, { title: "Foto de perfil", spec: "JPG o PNG · 640x480 px · máx. 2MB" }, { title: "Biografía", spec: "máx. 500 caracteres" }, { title: "Reseña del proyecto", spec: "máx. 750 caracteres" }, { title: "Plano de montaje", spec: "JPG o PNG · máx. 2MB" }, { title: "Imágenes del proyecto", spec: "máx. 15 imágenes · máx. 2MB c/u" }, { title: "Fichas técnicas de cada obra", spec: "" }, { title: "Imagen de detalle", spec: "JPG o PNG · máx. 2MB" }] },
  pasos: { badge: "Inscripción", title: "Pasos de", titleStrong: "inscripción", items: [{ title: "Registro en la plataforma", description: "Registrar correo, usuario y contraseña en la plataforma de la Feria." }, { title: "Pago", description: "Realizar el pago a través del portal de transacciones." }, { title: "Diligenciar formulario", description: "Completar todos los campos requeridos con documentos e información del proyecto." }] },
  rechazo: { badge: "Atención", title: "Causales de", titleStrong: "rechazo", items: ["Formulario incompleto o diligenciado incorrectamente", "Proyecto diseñado para espacio diferente al asignado", "Portafolio general con obras de múltiples series", "Falsedad o fraude comprobado", "Piezas con valor superior al determinado por la Feria", "Proyecto en otra plataforma de venta de arte"] },
  comisiones: { badge: "Condiciones", title: "Comisiones", note: "Los porcentajes y valores vigentes se detallan en el documento de bases y en el contrato firmado con la Feria.", items: [{ tag: "Durante el evento", text: "Para ventas entre $0 y $14.999.999" }, { tag: "Durante el evento", text: "Para ventas entre $15.000.000 y $29.999.999" }, { tag: "Durante el evento", text: "Para ventas de $30.000.000 en adelante" }, { tag: "Comisión adicional", text: "Para ventas post-evento" }, { tag: "Comisión adicional", text: "Por uso de datáfono" }, { tag: "Comisión adicional", text: "Por uso de plataforma de pago" }, { tag: "Comisión adicional", text: "Valor en COP por código QR" }, { tag: "Comisión adicional", text: "Valor en COP por mantenimiento (si hay ventas)" }] },
  compromisos: { badge: "Compromisos", title: "Derechos y", titleStrong: "compromisos", artistaTitle: "Del artista", artista: ["Responsable de producción y envío de registro fotográfico", "Máximo 10 reproducciones por serie", "Expone en espacio determinado por la Feria", "Establece precio: $800.000 a $2.500.000 COP", "Transacciones solo a través de canales autorizados", "Presente y disponible durante el evento", "Responsable del cuidado de sus obras", "Acompañado mínimo con un asistente", "Asistir en horarios dispuestos (penalidad 5% si no)", "Dejar espacio limpio", "Autoriza inclusión en base de datos", "Autoriza registro de imagen en fotos, audios y videos", "Responsable de logística de entrega post-evento", "Proyecto solo comercializado con la Feria por 1 año", "Cumplir con documento y contrato firmado"], feriaTitle: "De la Feria del Millón", feria: ["Publicar bases y habilitar aplicación en página web", "Designar comité de selección", "Retirar participantes por falsedad o fraude", "Adecuar espacio expositivo y plataforma digital", "Adecuar bodega de obras con sistema de inventario", "Designar espacio físico/digital a cada artista", "Acompañar artistas en producción, logística y montaje", "Aprobar montaje y dimensiones", "No responsable de equipos audiovisuales", "Diseñar afiches y piezas web", "Enviar invitaciones a compradores y coleccionistas", "Convocar medios de comunicación", "No se compromete a vender obras", "Ofrecer servicio de plataforma de pago y datáfono"] },
  cta: { badge: "Postulación", title: "¿Listo para", titleStrong: "participar?", paragraph: "Únete a la Feria del Millón 2026 y expón tu trabajo ante miles de visitantes, coleccionistas y compradores.", note: "Queremos seguir conociendo artistas y apoyarlos en sus procesos.", ctaPrimary: "Comenzar postulación →", ctaSecondary: "Escribir al equipo" },
  footerDescription: "La feria de arte emergente más importante de Latinoamérica.",
};

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
  convocatoriaPage: CONVOCATORIA_PAGE_DEFAULTS,
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
    social: { instagram: "", facebook: "", whatsapp: "", youtube: "", tiktok: "" },
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
    convocatoriaPage: mergeConvPage(l.convocatoriaPage),
  };
}

function mergeConvPage(c: any): ConvocatoriaPage {
  const D = CONVOCATORIA_PAGE_DEFAULTS;
  c = c || {};
  return {
    hero: { ...D.hero, ...(c.hero || {}) },
    dates: { ...D.dates, ...(c.dates || {}) },
    contactEmails: arr(c.contactEmails, D.contactEmails),
    stats: arr(c.stats, D.stats),
    closed: { ...D.closed, ...(c.closed || {}) },
    intro: { ...D.intro, ...(c.intro || {}), paragraphs: arr(c.intro?.paragraphs, D.intro.paragraphs) },
    impacto: { ...D.impacto, ...(c.impacto || {}), items: arr(c.impacto?.items, D.impacto.items) },
    cronograma: { ...D.cronograma, ...(c.cronograma || {}), cuando: arr(c.cronograma?.cuando, D.cronograma.cuando) },
    participantes: { ...D.participantes, ...(c.participantes || {}), no: arr(c.participantes?.no, D.participantes.no), si: arr(c.participantes?.si, D.participantes.si) },
    requisitos: { ...D.requisitos, ...(c.requisitos || {}), no: arr(c.requisitos?.no, D.requisitos.no), si: arr(c.requisitos?.si, D.requisitos.si) },
    documentos: { ...D.documentos, ...(c.documentos || {}), items: arr(c.documentos?.items, D.documentos.items) },
    pasos: { ...D.pasos, ...(c.pasos || {}), items: arr(c.pasos?.items, D.pasos.items) },
    rechazo: { ...D.rechazo, ...(c.rechazo || {}), items: arr(c.rechazo?.items, D.rechazo.items) },
    comisiones: { ...D.comisiones, ...(c.comisiones || {}), items: arr(c.comisiones?.items, D.comisiones.items) },
    compromisos: { ...D.compromisos, ...(c.compromisos || {}), artista: arr(c.compromisos?.artista, D.compromisos.artista), feria: arr(c.compromisos?.feria, D.compromisos.feria) },
    cta: { ...D.cta, ...(c.cta || {}) },
    footerDescription: c.footerDescription || D.footerDescription,
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
