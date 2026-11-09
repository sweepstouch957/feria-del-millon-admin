import { MySalesPage } from "@features/caja/components/MySalesPage";
import LockedNotice from "@/components/ui/LockedNotice";
import { SALES_DETAIL_ENABLED } from "@/utils/exportsLock";

export default function Page() {
  return SALES_DETAIL_ENABLED ? <MySalesPage /> : <LockedNotice title="Cierre de caja" />;
}
