// components/layout/layoutConfig.ts
import { FDM } from "@/app/theme";

/* Medidas y colores del marco del panel, tomados del diseño editorial:
   barra lateral oscura sobre papel, filetes de 1px, versalitas espaciadas.
   El riel es la lateral contraída a solo iconos. */

export const drawerWidth = 224;
export const railWidth = 60;
/** Ancho de la lateral en el cajón móvil (siempre con rótulos). */
export const mobileDrawerWidth = 264;
export const headerHeight = 58;

export const LAYOUT_COLORS = {
  /** Fondo de la lateral: la misma tinta del sitio público. */
  panel: FDM.panel,
  panelDark: "#141412",
  text: FDM.onDark,
  /** Rótulo de ítem inactivo. */
  text2: "rgba(245,244,239,0.66)",
  /** Título de sección. */
  textMuted: "rgba(245,244,239,0.42)",
  line: "rgba(245,244,239,0.10)",
  /** Filete de la lista de sub-ítems. */
  lineSoft: "rgba(245,244,239,0.14)",
  hover: "rgba(245,244,239,0.05)",
  selected: "rgba(245,244,239,0.08)",
  accent: FDM.green,
};

/** Sección y título de cada ruta: los usan la miga de pan y el <title>. */
export const ROUTES: Record<string, { crumb: string; title: string }> = {
  "/": { crumb: "General", title: "Tablero" },
  "/inventory/artworks": { crumb: "Feria y obras", title: "Obras" },
  "/inventory/artworks/qr": { crumb: "Feria y obras", title: "Etiquetas QR de obras" },
  "/inventory/carga": { crumb: "Feria y obras", title: "Estado de carga" },
  "/inventory/cities": { crumb: "Ajustes", title: "Ciudades" },
  "/inventory/techniques": { crumb: "Ajustes", title: "Técnicas" },
  "/users": { crumb: "Personas", title: "Usuarios" },
  "/solicitudes": { crumb: "Feria y obras", title: "Solicitudes" },
  "/personalizacion": { crumb: "Sitio y difusión", title: "Personalización" },
  "/comunicaciones": { crumb: "Sitio y difusión", title: "Comunicaciones" },
  "/qr": { crumb: "Sitio y difusión", title: "QR de enlaces" },
  "/events": { crumb: "Feria y obras", title: "Ferias" },
  "/tickets": { crumb: "Boletos", title: "Ver boletos" },
  "/tickets/validator": { crumb: "Boletos", title: "Validador QR" },
  "/tickets/taquilla": { crumb: "Boletos", title: "Taquilla" },
  "/tickets/asistentes": { crumb: "Boletos", title: "Informe de asistentes" },
  "/tickets/invitaciones": { crumb: "Boletos", title: "Invitaciones" },
  "/orders": { crumb: "Pedidos", title: "Listado de pedidos" },
  "/caja": { crumb: "Caja", title: "Vender obra" },
  "/caja/cierre": { crumb: "Caja", title: "Mi cierre del día" },
  "/orders/cartera": { crumb: "Pedidos", title: "Cartera / Fiado" },
  "/compradores": { crumb: "Personas", title: "Compradores" },
  "/reportes": { crumb: "Reportes", title: "Reportes" },
  "/reportes/ventas": { crumb: "Reportes", title: "Ventas de obras" },
  "/reportes/historico": { crumb: "Reportes", title: "Ferias anteriores" },
  "/my/artworks": { crumb: "Artista", title: "Mis obras" },
  "/my/orders": { crumb: "Artista", title: "Mis pedidos" },
  "/account": { crumb: "Cuenta", title: "Mi cuenta" },
  "/auditoria": { crumb: "Seguridad", title: "Auditoría" },
};

/** Coincidencia por prefijo más largo: /events/<id> hereda "Operación / Ferias". */
export function routeInfo(pathname: string) {
  if (ROUTES[pathname]) return ROUTES[pathname];
  const hit = Object.keys(ROUTES)
    .filter((p) => p !== "/" && pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];
  return hit ? ROUTES[hit] : { crumb: "Panel", title: "Feria del Millón" };
}
