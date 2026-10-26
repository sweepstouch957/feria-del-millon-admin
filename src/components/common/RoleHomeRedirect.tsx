"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/provider/authProvider";
import { homeFor } from "@/lib/roleHome";

/** El tablero solo se pinta para quien lo usa; caja y taquilla van a su pantalla. */
export default function RoleHomeRedirect({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const home = user ? homeFor(user.roles) : null;

  useEffect(() => {
    if (home && home !== "/") router.replace(home);
  }, [home, router]);

  return home === "/" ? children : null;
}
