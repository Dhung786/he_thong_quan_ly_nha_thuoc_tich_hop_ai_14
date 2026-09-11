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
        <Route path="/pharmacist/inventory" element={<PharmacistFeaturePage title="Tồn kho & lô thuốc" description="Theo dõi số lượng tồn, ngưỡng tồn tối thiểu, thông tin lô và hạn sử dụng để hỗ trợ tra cứu và nghiệp vụ hằng ngày." status="Đang chờ dữ liệu tồn kho và lô thuốc" />} />
        <Route path="/pharmacist/suppliers" element={<PharmacistFeaturePage title="Nhà cung cấp" description="Tra cứu và cập nhật thông tin nhà cung cấp thuốc theo quyền được cấp." status="Đang chờ API nhà cung cấp" />} />
        <Route path="/pharmacist/alerts" element={<PharmacistFeaturePage title="Cảnh báo" description="Theo dõi thuốc tồn thấp, thuốc hết hàng, lô sắp hết hạn và lô đã hết hạn." status="Đang chờ dữ liệu cảnh báo" />} />
        <Route path="/pharmacist/sales-support" element={<PharmacistFeaturePage title="Hỗ trợ bán thuốc" description="Tra cứu thuốc, kiểm tra tồn và chuẩn bị thông tin để hỗ trợ quá trình bán thuốc." status="Đang chờ API nghiệp vụ bán hàng" />} />
        <Route path="/pharmacist/ai" element={<PharmacistFeaturePage title="AI Dược sĩ" description="Tóm tắt thông tin thuốc, tham khảo báo cáo hạn dùng và hỏi đáp nội bộ bằng AI." status="AI chưa được cấu hình" safetyNote="AI chỉ hỗ trợ tham khảo và không thay thế quyết định chuyên môn của dược sĩ hoặc bác sĩ." />} />
        <Route path="/pharmacist/process" element={<PharmacistFeaturePage title="Quy trình nội bộ" description="Tra cứu nhanh các quy trình nội bộ như bán thuốc, kiểm kê và xử lý thuốc hết hạn." status="Đang chờ nguồn tài liệu nội bộ và AI" />} />
        <Route path="/pharmacist/reports" element={<PharmacistFeaturePage title="Báo cáo" description="Xem các báo cáo phục vụ nghiệp vụ như tồn kho, tồn thấp và thuốc sắp hết hạn." status="Đang chờ API báo cáo" />} />
        <Route path="/pharmacist/profile" element={<PharmacistFeaturePage title="Hồ sơ" description="Xem thông tin tài khoản Dược sĩ và thực hiện các thiết lập hồ sơ được hỗ trợ." status="Đang chờ API hồ sơ" />} />

        <Route path="/manager/imports" element={<ManagerFeaturePage title="Quản lý nhập thuốc" description="Quản lý danh sách lô nhập, thêm lô nhập và thông tin nhà cung cấp. Mỗi lô gồm thuốc, số lượng, ngày nhập, hạn sử dụng, giá nhập và giá bán." status="Đang chờ API lô nhập và nhà cung cấp" />} />
        <Route path="/manager/sales" element={<ManagerFeaturePage title="Bán thuốc" description="Tìm thuốc, kiểm tra tồn, nhập số lượng, tính thành tiền và tạo hóa đơn cho giao dịch bán thuốc." status="Đang chờ API bán thuốc và hóa đơn" />} />
        <Route path="/manager/inventory" element={<ManagerFeaturePage title="Tồn kho" description="Theo dõi số lượng tồn theo thuốc hoặc lô, so sánh với ngưỡng tối thiểu và phát hiện thuốc tồn thấp." status="Đang chờ API tồn kho" />} />
        <Route path="/manager/expiry" element={<ManagerFeaturePage title="Hạn sử dụng" description="Theo dõi hạn sử dụng theo lô, phân biệt thuốc sắp hết hạn và thuốc đã hết hạn để xử lý kịp thời." status="Đang chờ API hạn sử dụng và cảnh báo" />} />
        <Route path="/manager/lookup" element={<ManagerFeaturePage title="Tra cứu thuốc" description="Tra cứu thuốc theo tên, mã, nhóm, lô hoặc hạn sử dụng và xem thông tin chi tiết." status="Danh mục thuốc đã có dữ liệu; đang hoàn thiện tra cứu nâng cao" />} />
        <Route path="/manager/reports" element={<ManagerFeaturePage title="Báo cáo - Thống kê" description="Tổng hợp doanh thu, tồn kho và thuốc sắp hết hạn theo khoảng thời gian hoặc loại báo cáo." status="Đang chờ API báo cáo" />} />
        <Route path="/manager/ai" element={<ManagerFeaturePage title="Trợ lý AI" description="Tóm tắt thông tin thuốc, tổng hợp thuốc sắp hết hạn và hỗ trợ hỏi đáp quy trình nội bộ." status="AI chưa được cấu hình" />} />
        <Route path="/manager/users" element={<ManagerFeaturePage title="Tài khoản / Phân quyền" description="Quản lý tài khoản Quản lý, Dược sĩ và Khách hàng; thay đổi vai trò, khóa hoặc mở khóa và đặt lại mật khẩu khi được phép." status="Đang chờ API quản trị tài khoản" />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
