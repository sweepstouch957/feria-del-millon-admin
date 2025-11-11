/* eslint-disable @typescript-eslint/no-explicit-any */
// providers/AuthProvider.tsx
"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
  useRef,
} from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";

import {
  login as loginApi,
  register as registerApi,
  me as meApi,
  logout as logoutApi,
  AuthUser,
  setAuthHeaderFromCookie,
  clearAuth,
} from "@/services/auth.service";

type AuthContextType = {
  user: AuthUser | null;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Para persistir el usuario en el cliente
const USER_STORAGE_KEY = "auth_user";

/** Rutas públicas (todo lo demás es protegido) */
const PUBLIC_ROUTES = ["/login", "/forgot-password"];

function isPublicPath(pathname?: string | null) {
  if (!pathname) return false;
  return PUBLIC_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const loggingOutRef = useRef(false);

  // header para axios si tu token NO es httpOnly (no afecta la lógica de guard)
  useEffect(() => {
    setAuthHeaderFromCookie();
  }, []);

  // Hidratación inicial (intenta restaurar usuario cacheado)
  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(USER_STORAGE_KEY)
          : null;
      if (raw) setUser(JSON.parse(raw) as AuthUser);
    } catch {
      // ignore
    } finally {
      setHydrated(true);
    }
  }, []);

  // Guard centralizado
  useEffect(() => {
    const run = async () => {
      if (!hydrated || loggingOutRef.current) return;

      const onPublic = isPublicPath(pathname);

      if (onPublic) {
        // Opcional: si ya estás logueado y visitas /login, podrías redirigir al home
        setIsAuthLoading(false);
        return;
      }

      // RUTA PROTEGIDA → SIEMPRE validamos con /me
      try {
        setIsAuthLoading(true);
        const me = await meApi(); // debe enviar credenciales (withCredentials=true en axios)

        
        setUser(me);
        try {
          window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(me));
        } catch {}
      } catch {
        // Sesión inválida/expirada → limpiar y llevar a /login
        clearAuth();
        try {
          window.localStorage.removeItem(USER_STORAGE_KEY);
        } catch {}
        setUser(null);
        if (typeof window !== "undefined") router.replace("/login");
      } finally {
        setIsAuthLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, pathname]);

  // -------- Mutations --------
  const loginMutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      await loginApi(email, password); // setea cookie/token
      const me = await meApi(); // valida y trae usuario
      setUser(me);
      try {
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(me));
      } catch {}
      return me;
    },
    onSuccess: () => {
      // Después de login, puedes llevar al home o a la última ruta pretendida
      router.replace("/");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: any) => registerApi(payload),
    onSuccess: () => router.replace("/login"),
  });

  const logout = async () => {
    loggingOutRef.current = true;
    try {
      await logoutApi().catch(() => {});
      clearAuth();
      try {
        window.localStorage.removeItem(USER_STORAGE_KEY);
      } catch {}
      setUser(null);
    } finally {
      loggingOutRef.current = false;
      if (typeof window !== "undefined") window.location.replace("/");
    }
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthLoading,
      isAuthenticated: !!user?.email, // ya no dependemos de leer la cookie en el cliente
      login: async (email: string, password: string) => {
        await loginMutation.mutateAsync({ email, password });
      },
      register: async (payload: any) => {
        await registerMutation.mutateAsync(payload);
      },
      logout,
    }),
    [user, isAuthLoading, loginMutation, registerMutation]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
