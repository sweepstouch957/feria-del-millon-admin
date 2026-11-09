import { BuyersPage } from "@features/compradores/components/BuyersPage";
import LockedNotice from "@/components/ui/LockedNotice";
import { SALES_DETAIL_ENABLED } from "@/utils/exportsLock";

export default function Page() {
  return SALES_DETAIL_ENABLED ? <BuyersPage /> : <LockedNotice title="Compradores" />;
}
