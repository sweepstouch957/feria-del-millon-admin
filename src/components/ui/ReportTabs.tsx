"use client";

import { Tab, Tabs } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/provider/authProvider";

/* Reportes es una sola entrada del menú con dos vistas. La cajera solo ve el
   informe de ventas, así que para ella no hay pestañas. */
export default function ReportTabs() {
  const pathname = usePathname();
  const { user } = useAuth();
  if (!user?.roles?.superuser) return null;

  return (
    <Tabs value={pathname} sx={{ mb: 2 }}>
      <Tab component={Link} href="/reportes" value="/reportes" label="Resumen de ingresos" />
      <Tab component={Link} href="/reportes/ventas" value="/reportes/ventas" label="Ventas de obras" />
    </Tabs>
  );
}
