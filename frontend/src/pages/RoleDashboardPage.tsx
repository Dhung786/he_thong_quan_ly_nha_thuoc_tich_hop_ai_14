import { useAuth } from "../auth/auth-context";
import { CashierDashboardPage } from "./CashierPages";
import { DashboardPage } from "./DashboardPage";
import { PharmacistDashboardCleanPage } from "./PharmacistDashboardCleanPage";

export function RoleDashboardPage() {
  const auth = useAuth();

  if (auth.user?.role === "PHARMACIST") {
    return <PharmacistDashboardCleanPage />;
  }

  if (auth.user?.role === "CASHIER") {
    return <CashierDashboardPage />;
  }

  return <DashboardPage />;
}
