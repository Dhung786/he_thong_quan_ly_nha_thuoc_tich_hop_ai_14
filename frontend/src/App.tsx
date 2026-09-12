import { Navigate, Route, Routes } from "react-router-dom";

import { RequireAuth } from "./auth/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { ManagerAIWorkspacePage } from "./pages/ManagerAIWorkspacePage";
import { ManagerUsersPage } from "./pages/ManagerOperationalPages";
import {
  ManagerValidatedExpiryPage,
  ManagerValidatedImportsPage,
  ManagerValidatedInventoryPage,
  ManagerValidatedLookupPage,
  ManagerValidatedReportsPage,
  ManagerValidatedSalesPage,
} from "./pages/ManagerValidatedOperationalPages";
import { MedicineCatalogCleanPage } from "./pages/MedicineCatalogCleanPage";
import { PharmacistMedicineLookupPage } from "./pages/PharmacistMedicineLookupPage";
import {
  PharmacistAIPage,
  PharmacistAlertsPage,
  PharmacistInventoryPage,
  PharmacistProcessPage,
  PharmacistProfilePage,
  PharmacistReportsPage,
  PharmacistSalesPage,
  PharmacistSuppliersPage,
} from "./pages/PharmacistOperationalPages";
import { RoleDashboardPage } from "./pages/RoleDashboardPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<RoleDashboardPage />} />
        <Route path="/catalog" element={<MedicineCatalogCleanPage />} />

        <Route path="/pharmacist/medicines" element={<PharmacistMedicineLookupPage />} />
        <Route path="/pharmacist/inventory" element={<PharmacistInventoryPage />} />
        <Route path="/pharmacist/suppliers" element={<PharmacistSuppliersPage />} />
        <Route path="/pharmacist/alerts" element={<PharmacistAlertsPage />} />
        <Route path="/pharmacist/sales-support" element={<PharmacistSalesPage />} />
        <Route path="/pharmacist/ai" element={<PharmacistAIPage />} />
        <Route path="/pharmacist/process" element={<PharmacistProcessPage />} />
        <Route path="/pharmacist/reports" element={<PharmacistReportsPage />} />
        <Route path="/pharmacist/profile" element={<PharmacistProfilePage />} />

        <Route path="/manager/imports" element={<ManagerValidatedImportsPage />} />
        <Route path="/manager/sales" element={<ManagerValidatedSalesPage />} />
        <Route path="/manager/inventory" element={<ManagerValidatedInventoryPage />} />
        <Route path="/manager/expiry" element={<ManagerValidatedExpiryPage />} />
        <Route path="/manager/lookup" element={<ManagerValidatedLookupPage />} />
        <Route path="/manager/reports" element={<ManagerValidatedReportsPage />} />
        <Route path="/manager/ai" element={<ManagerAIWorkspacePage />} />
        <Route path="/manager/users" element={<ManagerUsersPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
