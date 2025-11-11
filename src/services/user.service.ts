/* eslint-disable @typescript-eslint/no-explicit-any */
// services/users.service.ts

import apiClient from "@/axios";

/* ========= Tipos ========= */
export type RoleKey = "superuser" | "staff" | "curador" | "cajero" | "artista";

export interface Roles {
  superuser?: boolean;
  staff?: boolean;
  curador?: boolean;
  cajero?: boolean;
  artista?: boolean;
}

export interface UserDTO {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  city?: string;
  address?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
  documentType?: "CC" | "NIT" | "CE" | "PP" | "OTRO" | "INE";
  documentNumber?: string;
  active?: boolean;
  roles?: Roles;
  lastLoginAt?: string | null;
  registeredAt?: string;
  createdAt?: string;
  updatedAt?: string;
  [k: string]: any;
}

export interface UsersSearchParams {
  q?: string; // texto libre: firstName,lastName,email,mobile
  city?: string; // regex
  roles?: RoleKey[]; // array -> CSV
  active?: boolean; // true|false
  createdFrom?: string; // ISO
  createdTo?: string; // ISO
  page?: number; // default 1
  limit?: number; // default 20
  sortBy?: string; // createdAt, firstName, etc.
  sortDir?: "asc" | "desc"; // default desc
  fields?: string[]; // proyección
}

export interface UsersSearchResponse {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  count: number;
  users: UserDTO[];
  meta?: {
    roles?: RoleKey[];
    sortBy?: string;
    sortDir?: "asc" | "desc";
  };
}

/* ========= Helpers ========= */
const toQuery = (params: Record<string, any> = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) {
      if (k === "roles") q.set("roles", v.join(",")); // CSV
      else if (k === "fields") q.set("fields", v.join(","));
      else q.set(k, v.join(","));
    } else if (typeof v === "boolean") {
      q.set(k, v ? "true" : "false");
    } else {
      q.set(k, String(v));
    }
  });
  return q.toString();
};

/* ========= Ruta base ========= */
const BASE = "/auth/users";

/* ========= Services ========= */

// Listar/buscar usuarios (con filtros y roles)
export async function listUsers(
  params: UsersSearchParams = {}
): Promise<UsersSearchResponse> {
  const qs = toQuery({
    q: params.q,
    city: params.city,
    roles: params.roles,
    active: params.active,
    createdFrom: params.createdFrom,
    createdTo: params.createdTo,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    sortBy: params.sortBy ?? "createdAt",
    sortDir: params.sortDir ?? "desc",
    fields: params.fields,
  });

  const url = qs ? `${BASE}?${qs}` : BASE;
  const { data } = await apiClient.get<UsersSearchResponse>(url, {
    withCredentials: true,
  });

  // Normaliza id y roles
  const users = (data.users || []).map((u: any) => ({
    ...u,
    id: u.id ?? u._id ?? u.id,
    roles: u.roles ?? {},
  }));

  return { ...data, users };
}

// Obtener un usuario por id
export async function getUserById(id: string): Promise<UserDTO> {
  const { data } = await apiClient.get<{ user: UserDTO }>(`${BASE}/${id}`, {
    withCredentials: true,
  });
  const u: any = data.user || (data as any);
  return {
    ...u,
    id: u.id ?? u._id ?? u.id,
    roles: u.roles ?? {},
  };
}

// Crear usuario (admin)
export interface CreateUserPayload {
  email: string;
  password?: string; // si no envías, el backend puede autogenerar
  firstName?: string;
  lastName?: string;
  mobile?: string;
  city?: string;
  roles?: Roles;
  active?: boolean;
  [k: string]: any;
}
export async function createUser(
  payload: CreateUserPayload
): Promise<{ id: string; email: string }> {
  const { data } = await apiClient.post<{ id: string; email: string }>(
    BASE,
    payload,
    { withCredentials: true }
  );
  return data;
}

// Actualizar usuario (admin) — sin tocar passwordHash
export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  mobile?: string;
  city?: string;
  address?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
  roles?: Roles;
  active?: boolean;
  documentType?: UserDTO["documentType"];
  documentNumber?: string;
  [k: string]: any;
}
export async function updateUser(
  id: string,
  payload: UpdateUserPayload
): Promise<UserDTO> {
  const { data } = await apiClient.patch<{ user: UserDTO }>(
    `${BASE}/${id}`,
    payload,
    { withCredentials: true }
  );
  const u: any = data.user || (data as any);
  return {
    ...u,
    id: u.id ?? u._id ?? u.id,
    roles: u.roles ?? {},
  };
}

// Activar/desactivar usuario rápidamente
export async function setUserActive(
  id: string,
  active: boolean
): Promise<UserDTO> {
  return updateUser(id, { active });
}

// Eliminar usuario (si tu backend lo permite)
export async function deleteUser(id: string): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(`${BASE}/${id}`, {
    withCredentials: true,
  });
  return data;
}
