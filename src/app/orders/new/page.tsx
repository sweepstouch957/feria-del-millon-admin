// app/orders/new/page.tsx — la venta en caja vive ahora en /caja.
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/caja");
}
