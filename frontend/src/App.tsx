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
import { PharmacistAIWorkspacePage } from "./pages/PharmacistAIWorkspacePage";
import { PharmacistFeaturePage } from "./pages/PharmacistFeaturePage";
import { PharmacistMedicineLookupPage } from "./pages/PharmacistMedicineLookupPage";
import { PharmacistProfilePage } from "./pages/PharmacistProfilePage";
import { PharmacistSuppliersPage } from "./pages/PharmacistSuppliersPage";
import { RoleDashboardPage } from "./pages/RoleDashboardPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<RoleDashboardPage />} />
        <Route path="/catalog" element={<MedicineCatalogCleanPage />} />

        <Route path="/pharmacist/medicines" element={<PharmacistMedicineLookupPage />} />
        <Route path="/pharmacist/inventory" element={<PharmacistFeaturePage title="Tồn kho & lô thuốc" description="Theo dõi số lượng tồn, ngưỡng tồn tối thiểu, thông tin lô và hạn sử dụng để hỗ trợ tra cứu và nghiệp vụ hằng ngày." status="API tồn kho và lô thuốc đã sẵn sàng" />} />
        <Route path="/pharmacist/suppliers" element={<PharmacistSuppliersPage />} />
        <Route path="/pharmacist/alerts" element={<PharmacistFeaturePage title="Cảnh báo" description="Theo dõi thuốc tồn thấp, thuốc hết hàng, lô sắp hết hạn và lô đã hết hạn." status="API cảnh báo tồn kho và hạn dùng đã sẵn sàng" />} />
        <Route path="/pharmacist/sales-support" element={<PharmacistFeaturePage title="Hỗ trợ bán thuốc" description="Tra cứu thuốc, kiểm tra tồn và chuẩn bị thông tin để hỗ trợ quá trình bán thuốc." status="API tra cứu tồn kho đã sẵn sàng" />} />
        <Route path="/pharmacist/ai" element={<PharmacistAIWorkspacePage />} />
        <Route path="/pharmacist/process" element={<PharmacistAIWorkspacePage processOnly />} />
        <Route path="/pharmacist/reports" element={<PharmacistFeaturePage title="Báo cáo" description="Xem các báo cáo phục vụ nghiệp vụ như tồn kho, tồn thấp và thuốc sắp hết hạn." status="API báo cáo nghiệp vụ đã sẵn sàng" />} />
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
