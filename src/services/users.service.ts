import { listUsers, type RoleKey, type UserDTO } from "./user.service";

export interface SearchArtistsParams {
  q?: string;
  limit?: number;
  roles?: string[];
}

export async function searchArtists(
  params: SearchArtistsParams = {}
): Promise<UserDTO[]> {
  return searchUsersByRole("artista", params.q, params.limit);
}

/** Cuentas que coincidan con el texto. Sin `role` busca en todas: para nombrar
 *  a un cajero hay que poder encontrar a quien todavía no lo es. */
export async function searchUsersByRole(
  role: RoleKey | undefined,
  q?: string,
  limit = 20
): Promise<UserDTO[]> {
  const resp = await listUsers({
    q,
    ...(role ? { roles: [role] } : {}),
    limit,
    sortBy: "firstName",
    sortDir: "asc",
    fields: ["firstName", "lastName", "email"],
  });

  return resp.users;
}
