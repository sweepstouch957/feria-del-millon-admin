// app/page.tsx
import ScreenFallback from "@/components/common/ScreenFallback";
import HomeClient from "@/components/HomeClient";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense
      fallback={<ScreenFallback text="Cargando…"/>}
    >
      <HomeClient />
    </Suspense>
  );
}
