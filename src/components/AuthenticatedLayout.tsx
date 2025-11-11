// components/layouts/AuthenticatedLayout.tsx
"use client";

import { usePathname } from "next/navigation";
import MergedLayout from "./MergedLayout";
import { useAuth } from "@/provider/authProvider";
import LoadingScreen from "@/components/common/LoadingScreen";
import { useTranslation } from "react-i18next";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

const PUBLIC_ROUTES = ["/login", "/forgot-password"];

const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const { isAuthenticated, isAuthLoading } = useAuth();
  const { t } = useTranslation();

  const isPublic = PUBLIC_ROUTES.some(
    (p) => pathname === p || pathname?.startsWith(`${p}/`)
  );

  // 🔹 Rutas públicas (login, forgot-password)
  if (isPublic) return <>{children}</>;

  // 🔹 Mientras carga la sesión o hace redirect
  if (isAuthLoading || !isAuthenticated) {
    return <LoadingScreen label={t("loading.session")} />;
  }

  // 🔹 Sesión válida
  return <MergedLayout>{children}</MergedLayout>;
};

export default AuthenticatedLayout;