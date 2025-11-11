// app/login/page.tsx
import ScreenFallback from "@/components/common/ScreenFallback";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense
      fallback={<ScreenFallback/>}
    >
      No se encontró la página
    </Suspense>
  );
}
