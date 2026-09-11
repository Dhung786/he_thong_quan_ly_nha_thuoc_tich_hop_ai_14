import { useAuth } from "../auth/auth-context";
import { DashboardPage } from "./DashboardPage";
import { PharmacistDashboardCleanPage } from "./PharmacistDashboardCleanPage";

export function RoleDashboardPage() {
  const auth = useAuth();

  if (auth.user?.role === "PHARMACIST") {
    return <PharmacistDashboardCleanPage />;
  }

  return <DashboardPage />;
}
