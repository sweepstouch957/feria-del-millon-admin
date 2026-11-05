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
  jefeCaja?: boolean; // caja + apartados y abonos
  taquilla?: boolean;
  editor?: boolean;
  artista?: boolean;
  asistente?: boolean;
  vip?: boolean;
  mentor?: boolean;
  comprador?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  roles?: Roles;
  firstName?: string;
  lastName?: string;
  /** Capacitación: lo prende un superuser; nada de lo que haga se guarda. */
  practiceMode?: boolean;
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
    // Cookie con fecha (la del JWT): sin ella es "de sesión" y el acceso directo
    // de la pantalla de inicio (webapp) o cerrar Chrome la borra.
    let expires: Date | undefined;
    try {
      const exp = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp;
      if (exp) expires = new Date(exp * 1000);
    } catch {}
    Cookies.set(AUTH_TOKEN_KEY, token, { expires, sameSite: "lax", secure: location.protocol === "https:" });
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

/** Canjea el enlace de un solo uso del correo de acceso. */
export const loginWithLink = async (token: string) => {
  const { data } = await apiClient.post<LoginResponse>(
    "/auth/login/link",
    { token },
    { withCredentials: true }
  );
  setAuthToken(data.token);
  return data;
};

/** Superuser: enlace de ingreso de un solo uso para imprimir en QR. El servidor verifica la clave. */
export const createAccessLink = async (email: string, password: string) => {
  const { data } = await apiClient.post<{ token: string; email: string; firstName: string; lastName: string; expiresAt: string }>(
    "/auth/users/access-link",
    { email, password },
    { withCredentials: true }
  );
  return data;
};

/** Superuser: manda el correo con botón de ingreso y credenciales. El servidor verifica la clave. */
export const sendAccessEmail = async (email: string, password: string, loginUrl: string) => {
  await apiClient.post("/auth/users/access-email", { email, password, loginUrl }, { withCredentials: true });
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
    // Modo práctica apagado para siempre (5-nov): cajeras con el flag puesto
    // "vendían" sin guardar ni bajar stock durante la feria real.
    practiceMode: false,
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

