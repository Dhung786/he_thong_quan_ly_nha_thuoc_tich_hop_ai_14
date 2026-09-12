import { Navigate, Route, Routes } from "react-router-dom";

import { RequireAuth } from "./auth/RequireAuth";
import { CashierDashboardEnhancedPage } from "./pages/CashierDashboardEnhancedPage";
import {
  CashierMedicineLookupPage,
  CashierProfilePage,
} from "./pages/CashierPages";
import {
  CashierAssistantPage,
  CashierEnhancedInvoicesPage,
  CashierEnhancedSalesPage,
  CashierShiftSummaryPage,
} from "./pages/CashierEnhancedPages";
import { LoginPage } from "./pages/LoginPage";
import { ManagerAIWorkspacePage } from "./pages/ManagerAIWorkspacePage";
import { ManagerUsersCashierPage } from "./pages/ManagerUsersCashierPage";
import {
  ManagerValidatedExpiryPage,
  ManagerValidatedImportsPage,
  ManagerValidatedInventoryPage,
  ManagerValidatedLookupPage,
  ManagerValidatedReportsPage,
  ManagerValidatedSalesPage,
} from "./pages/ManagerValidatedOperationalPages";
import { MedicineCatalogCleanPage } from "./pages/MedicineCatalogCleanPage";
import { PharmacistAIWorkspacePage } from "./pages/PharmacistAIWorkspacePage";
import { PharmacistFeaturePage } from "./pages/PharmacistFeaturePage";
import { PharmacistMedicineLookupPage } from "./pages/PharmacistMedicineLookupPage";
import { PharmacistProfilePage } from "./pages/PharmacistProfilePage";
import { PharmacistSalesSupportPage } from "./pages/PharmacistSalesSupportPage";
import { PharmacistSuppliersPage } from "./pages/PharmacistSuppliersPage";
import { RoleDashboardPage } from "./pages/RoleDashboardPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<RoleDashboardPage />} />
        <Route path="/catalog" element={<MedicineCatalogCleanPage />} />

        <Route path="/cashier" element={<CashierDashboardEnhancedPage />} />
        <Route path="/cashier/sales" element={<CashierEnhancedSalesPage />} />
        <Route path="/cashier/medicines" element={<CashierMedicineLookupPage />} />
        <Route path="/cashier/invoices" element={<CashierEnhancedInvoicesPage />} />
        <Route path="/cashier/shift" element={<CashierShiftSummaryPage />} />
        <Route path="/cashier/assistant" element={<CashierAssistantPage />} />
        <Route path="/cashier/profile" element={<CashierProfilePage />} />

        <Route path="/pharmacist/medicines" element={<PharmacistMedicineLookupPage />} />
        <Route path="/pharmacist/inventory" element={<PharmacistFeaturePage title="Tồn kho & lô thuốc" description="Theo dõi số lượng tồn, ngưỡng tồn tối thiểu, thông tin lô và hạn sử dụng để hỗ trợ tra cứu và nghiệp vụ hằng ngày." />} />
        <Route path="/pharmacist/suppliers" element={<PharmacistSuppliersPage />} />
        <Route path="/pharmacist/alerts" element={<PharmacistFeaturePage title="Cảnh báo" description="Theo dõi thuốc tồn thấp, thuốc hết hàng, lô sắp hết hạn và lô đã hết hạn." />} />
        <Route path="/pharmacist/sales-support" element={<PharmacistSalesSupportPage />} />
        <Route path="/pharmacist/ai" element={<PharmacistAIWorkspacePage />} />
        <Route path="/pharmacist/process" element={<PharmacistAIWorkspacePage processOnly />} />
        <Route path="/pharmacist/reports" element={<PharmacistFeaturePage title="Báo cáo" description="Xem các báo cáo phục vụ nghiệp vụ như tồn kho, tồn thấp và thuốc sắp hết hạn." />} />
        <Route path="/pharmacist/profile" element={<PharmacistProfilePage />} />

        <Route path="/manager/imports" element={<ManagerValidatedImportsPage />} />
        <Route path="/manager/sales" element={<ManagerValidatedSalesPage />} />
        <Route path="/manager/inventory" element={<ManagerValidatedInventoryPage />} />
        <Route path="/manager/expiry" element={<ManagerValidatedExpiryPage />} />
        <Route path="/manager/lookup" element={<ManagerValidatedLookupPage />} />
        <Route path="/manager/reports" element={<ManagerValidatedReportsPage />} />
        <Route path="/manager/ai" element={<ManagerAIWorkspacePage />} />
        <Route path="/manager/users" element={<ManagerUsersCashierPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
