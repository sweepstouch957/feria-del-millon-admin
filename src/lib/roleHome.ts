import type { Roles } from "@services/auth.service";

/** Página de entrada según el rol. La caja y la taquilla no usan el tablero. */
export function homeFor(roles: Roles = {}): string {
  if (roles.superuser || roles.staff) return "/";
  if (roles.cajero || roles.jefeCaja) return "/caja";
  if (roles.taquilla) return "/tickets/validator";
  return "/";
}

/* Caja y taquilla solo venden lo suyo y ven su cierre del día: el resto del
   panel (pedidos de todos, reportes, asistentes, ferias) no se abre aunque
   escriban la dirección. El backend lo exige igual; esto evita pantallas rotas. */
const PATHS: Record<string, string[]> = {
  // Desde el 5-nov las cajeras también venden entradas en taquilla.
  cajero: ["/caja", "/tickets/validator", "/tickets/taquilla"],
  jefeCaja: ["/caja", "/tickets/validator", "/tickets/taquilla", "/orders/cartera"],
  taquilla: ["/tickets/taquilla", "/tickets/validator", "/caja/guia"],
  artista: ["/", "/my"],
  editor: ["/personalizacion", "/comunicaciones", "/qr"],
};

const r = (roles: Roles) => roles as Record<string, boolean | undefined>;

export function canOpen(roles: Roles = {}, path: string): boolean {
  const x = r(roles);
  if (x.superuser || x.staff || x.curador) return true;
  const seller = x.cajero || x.jefeCaja || x.taquilla;
  if (!seller) return true; // otros perfiles: sin cambios
  if (path === "/account" || path.startsWith("/account/") || path === "/login") return true;
  const allowed = Object.keys(PATHS).filter((k) => x[k]).flatMap((k) => PATHS[k]);
  return allowed.some((p) => (p === "/" ? path === "/" : path === p || path.startsWith(`${p}/`)));
}
