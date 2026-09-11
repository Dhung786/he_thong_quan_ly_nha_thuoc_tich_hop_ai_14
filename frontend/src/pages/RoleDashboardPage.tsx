import { useAuth } from "../auth/auth-context";
import { DashboardPage } from "./DashboardPage";
import { PharmacistDashboardPage } from "./PharmacistDashboardPage";

export function RoleDashboardPage() {
  const auth = useAuth();

  if (auth.user?.role === "PHARMACIST") {
    return <PharmacistDashboardPage />;
  }

  return <DashboardPage />;
}
