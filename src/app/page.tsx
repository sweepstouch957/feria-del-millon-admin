// app/page.tsx
import ScreenFallback from "@/components/common/ScreenFallback";
import HomeClient from "@/components/HomeClient";
import RoleHomeRedirect from "@/components/common/RoleHomeRedirect";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense
      fallback={<ScreenFallback text="Cargando…"/>}
    >
      <RoleHomeRedirect>
        <HomeClient />
      </RoleHomeRedirect>
    </Suspense>
  );
}
