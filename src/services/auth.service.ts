/* eslint-disable @typescript-eslint/no-explicit-any */
// services/auth.service.ts
import apiClient from "@/axios";
import { AUTH_TOKEN_KEY } from "@/core/constants";
import Cookies from "js-cookie";

// ─────────────────────────────────────────────────────────────
// Tipos de Roles / Usuario
// ─────────────────────────────────────────────────────────────
export interface Roles {
  superuser?: boolean;
  staff?: boolean;
  curador?: boolean;
  cajero?: boolean;
  artista?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  roles?: Roles;
  firstName?: string;
  lastName?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  // cualquier extra que tu backend permita (mobile, doc, etc.)
  [k: string]: any;
}

export interface RegisterResponse {
  id: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    roles?: Roles;
    firstName?: string;
    lastName?: string;
  };
}

// ─────────────────────────────────────────────────────────────
// Helpers de Auth
// ─────────────────────────────────────────────────────────────
const setAuthToken = (token: string | null) => {
  if (token) {
    Cookies.set(AUTH_TOKEN_KEY, token);
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    Cookies.remove(AUTH_TOKEN_KEY);
    delete apiClient.defaults.headers.common.Authorization;
  }
};

// Llama esto temprano (ej. en el Provider) para hidratar el header desde cookie
export const setAuthHeaderFromCookie = () => {
  const token = Cookies.get(AUTH_TOKEN_KEY) || null;
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
};

export const clearAuth = () => setAuthToken(null);

// ─────────────────────────────────────────────────────────────
// Auth básico: register + login
// ─────────────────────────────────────────────────────────────
export const register = async (payload: RegisterPayload) => {
  const { data } = await apiClient.post<RegisterResponse>(
    "/auth/register",
    payload,
    { withCredentials: true }
  );
  return data;
};

export const login = async (email: string, password: string) => {
  const { data } = await apiClient.post<LoginResponse>(
    "/auth/login",
    { email, password },
    { withCredentials: true }
  );
  // Guarda token y header para siguientes requests
  setAuthToken(data.token);
  return data;
};

// ─────────────────────────────────────────────────────────────
// /me y /logout
// ─────────────────────────────────────────────────────────────
export const me = async (): Promise<AuthUser> => {
  const { data } = await apiClient.get<{ user: AuthUser }>("/auth/me", {
    withCredentials: true,
  });
  // Normaliza por si el backend usa _id
  const u = data.user as any;
  return {
    id: u.id || u._id || u.id,
    email: u.email,
    roles: u.roles,
    firstName: u.firstName,
    lastName: u.lastName,
  };
};

export const logout = async (): Promise<void> => {
  // Si tu backend requiere auth header, ya va con axios defaults
  await apiClient
    .post("/auth/logout", {}, { withCredentials: true })
    .catch(() => {
      // Si falla, igual limpiaremos cliente
    });
  clearAuth();
};

// ─────────────────────────────────────────────────────────────
// Users by Role (cliente del endpoint GET /auth/users/by-role/:role)
// ─────────────────────────────────────────────────────────────
export interface UserListItem extends AuthUser {
  mobile?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // agrega campos que devuelva tu API (city, documentNumber, etc.)
}

export interface GetUsersByRoleParams {
  q?: string; // búsqueda por texto (nombre, email, etc.)
  city?: string; // ciudad
  active?: boolean; // true/false
  skip?: number; // paginación
  limit?: number; // paginación
}

export const getUsersByRole = async (
  role: keyof Roles,
  params?: GetUsersByRoleParams
): Promise<{ count: number; users: UserListItem[] }> => {
  const { data } = await apiClient.get<{
    count: number;
    users: UserListItem[];
  }>(`/auth/users/by-role/${role}`, {
    params,
    withCredentials: true,
  });

  // normaliza id por si viene como _id
  const users = (data.users || []).map((u: any) => ({
    ...u,
    id: u.id || u._id || u.id,
  }));

  return { count: data.count ?? users.length, users };
};
