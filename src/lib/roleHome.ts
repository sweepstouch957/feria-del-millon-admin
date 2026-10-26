import type { Roles } from "@services/auth.service";

/** Página de entrada según el rol. La caja y la taquilla no usan el tablero. */
export function homeFor(roles: Roles = {}): string {
  if (roles.superuser || roles.staff) return "/";
  if (roles.cajero) return "/caja";
  if (roles.taquilla) return "/tickets/validator";
  return "/";
}
