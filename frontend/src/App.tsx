import { Navigate, Route, Routes } from "react-router-dom";

import { RequireAuth } from "./auth/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { ManagerFeaturePage } from "./pages/ManagerFeaturePage";
import { MedicineCatalogPage } from "./pages/MedicineCatalogPage";
import { PharmacistFeaturePage } from "./pages/PharmacistFeaturePage";
import { PharmacistMedicineLookupPage } from "./pages/PharmacistMedicineLookupPage";
import { RoleDashboardPage } from "./pages/RoleDashboardPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<RoleDashboardPage />} />
        <Route path="/catalog" element={<MedicineCatalogPage />} />

        <Route path="/pharmacist/medicines" element={<PharmacistMedicineLookupPage />} />
        <Route path="/pharmacist/inventory" element={<PharmacistFeaturePage eyebrow="UC003 · UC006" title="Tồn kho & lô thuốc" description="Dược sĩ theo dõi số lượng tồn, thông tin lô và hạn sử dụng để phục vụ tra cứu và hỗ trợ bán thuốc." backendStatus="Chờ UC003/UC006" />} />
        <Route path="/pharmacist/alerts" element={<PharmacistFeaturePage eyebrow="UC008" title="Cảnh báo" description="Khu vực tập trung cảnh báo thuốc tồn thấp, thuốc hết hàng, lô sắp hết hạn và lô đã hết hạn dành cho Dược sĩ." backendStatus="Chờ UC008" />} />
        <Route path="/pharmacist/sales-support" element={<PharmacistFeaturePage eyebrow="UC004 · Hỗ trợ nghiệp vụ" title="Hỗ trợ bán thuốc" description="Không gian hỗ trợ Dược sĩ trong quá trình bán thuốc: tra cứu thuốc, kiểm tra tồn và chuẩn bị thông tin tư vấn." backendStatus="Chờ UC004" />} />
        <Route path="/pharmacist/ai" element={<PharmacistFeaturePage eyebrow="UC010 · UC011 · UC013" title="AI Dược sĩ" description="Dược sĩ dùng AI để tham khảo, tóm tắt thông tin thuốc và hỗ trợ đọc báo cáo nghiệp vụ." backendStatus="AI provider chưa cấu hình" safetyNote="Scope Guard phải từ chối chẩn đoán, kê đơn và chỉ định điều trị; AI không được tự sửa tồn kho, hóa đơn hoặc dữ liệu nghiệp vụ." />} />
        <Route path="/pharmacist/process" element={<PharmacistFeaturePage eyebrow="UC012" title="Quy trình nội bộ" description="Khu vực hỏi đáp các quy trình nội bộ dành cho Dược sĩ." backendStatus="Chờ nguồn tài liệu nội bộ + AI adapter" />} />
        <Route path="/pharmacist/reports" element={<PharmacistFeaturePage eyebrow="UC009 · UC011" title="Báo cáo" description="Dược sĩ xem các báo cáo phục vụ nghiệp vụ như tồn kho, thuốc tồn thấp và thuốc sắp hết hạn." backendStatus="Chờ UC009/UC011" />} />
        <Route path="/pharmacist/profile" element={<PharmacistFeaturePage eyebrow="Tài khoản" title="Hồ sơ" description="Khu vực thông tin tài khoản Dược sĩ và đổi mật khẩu." backendStatus="Chờ profile API" />} />

        <Route path="/manager/imports" element={<ManagerFeaturePage eyebrow="UC003 · UC005" title="Quản lý nhập thuốc" description="Danh sách lô nhập, thêm lô nhập và quản lý nhà cung cấp theo cây chức năng được phê duyệt." backendStatus="Chờ UC003/UC005" />} />
        <Route path="/manager/sales" element={<ManagerFeaturePage eyebrow="UC004" title="Bán thuốc" description="Giao diện bán thuốc và hóa đơn dành cho Quản lý. Không ghi giao dịch thật cho đến khi quy tắc chọn lô và permission được chốt đầy đủ." backendStatus="Chờ UC004" />} />
        <Route path="/manager/inventory" element={<ManagerFeaturePage eyebrow="UC006" title="Tồn kho" description="Danh sách tồn kho và cảnh báo tồn thấp. Số liệu sẽ lấy từ PostgreSQL khi backend tồn kho hoàn tất." backendStatus="Chờ UC006" />} />
        <Route path="/manager/expiry" element={<ManagerFeaturePage eyebrow="UC008" title="Hạn sử dụng" description="Theo dõi thuốc sắp hết hạn và thuốc đã hết hạn. Không hiển thị dữ liệu giả." backendStatus="Chờ UC008" />} />
        <Route path="/manager/lookup" element={<ManagerFeaturePage eyebrow="UC007" title="Tra cứu thuốc" description="Khu vực tra cứu nhanh thông tin thuốc. Danh mục thuốc hiện đã có dữ liệu thật từ UC002." backendStatus="Có dữ liệu UC002 · chờ hoàn thiện UC007" />} />
        <Route path="/manager/reports" element={<ManagerFeaturePage eyebrow="UC009 · UC011" title="Báo cáo - Thống kê" description="Báo cáo doanh thu, tồn kho và thuốc sắp hết hạn; AI báo cáo chỉ hoạt động khi adapter và Scope Guard sẵn sàng." backendStatus="Chờ UC009/UC011" />} />
        <Route path="/manager/ai" element={<ManagerFeaturePage eyebrow="UC010–UC013" title="Trợ lý AI" description="AI tóm tắt thông tin thuốc, AI báo cáo thuốc sắp hết hạn và chatbot quy trình nội bộ." backendStatus="AI provider chưa cấu hình" />} />
        <Route path="/manager/users" element={<ManagerFeaturePage eyebrow="Tài khoản / Phân quyền" title="Tài khoản / Phân quyền" description="Quản lý tài khoản Quản lý, Dược sĩ và Khách hàng; khóa/mở tài khoản và phân quyền khi backend enforce đầy đủ." backendStatus="Chờ API quản trị" />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
