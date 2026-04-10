import { listUsers, UserDTO } from "./user.service";

export interface SearchArtistsParams {
  q?: string;
  limit?: number;
  roles?: string[];
}

export async function searchArtists(
  params: SearchArtistsParams = {}
): Promise<UserDTO[]> {
  const resp = await listUsers({
    q: params.q,
    roles: ["artista"],
    limit: params.limit ?? 20,
    sortBy: "firstName",
    sortDir: "asc",
    fields: ["firstName", "lastName", "email"],
  });

  return resp.users;
}
