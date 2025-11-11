// app/login/page.tsx
import ScreenFallback from "@/components/common/ScreenFallback";
import LoginClient from "@/components/views/LoginView";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense
      fallback={<ScreenFallback/>}
    >
      <LoginClient />
    </Suspense>
  );
}
