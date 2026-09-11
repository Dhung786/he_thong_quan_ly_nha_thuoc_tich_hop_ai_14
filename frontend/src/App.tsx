import { Navigate, Route, Routes } from "react-router-dom";

import { RequireAuth } from "./auth/RequireAuth";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ManagerFeaturePage } from "./pages/ManagerFeaturePage";
import { MedicineCatalogPage } from "./pages/MedicineCatalogPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/catalog" element={<MedicineCatalogPage />} />
        <Route
          path="/manager/sales"
          element={
            <ManagerFeaturePage
              eyebrow="UC004"
              title="Bán thuốc"
              description="Khu vực bán thuốc và lập hóa đơn dành cho Quản lý. Backend giao dịch, kiểm tra tồn và cập nhật tồn sẽ được triển khai sau khi chốt quy tắc chọn lô."
              backendStatus="Chưa triển khai UC004"
            />
          }
        />
        <Route
          path="/manager/inventory"
          element={
            <ManagerFeaturePage
              eyebrow="UC003 · UC006"
              title="Kho thuốc"
              description="Quản lý lô nhập, hạn sử dụng và tồn kho. Route đã sẵn sàng để kết nối API PostgreSQL cho lô nhập và kiểm tra tồn."
              backendStatus="Chờ UC003/UC006"
            />
          }
        />
        <Route
          path="/manager/alerts"
          element={
            <ManagerFeaturePage
              eyebrow="UC008"
              title="Cảnh báo"
              description="Theo dõi thuốc tồn thấp và thuốc sắp hết hạn. Không hiển thị số liệu giả khi backend cảnh báo chưa được triển khai."
              backendStatus="Chờ UC008"
            />
          }
        />
        <Route
          path="/manager/customers"
          element={
            <ManagerFeaturePage
              eyebrow="Yêu cầu bổ sung"
              title="Khách hàng"
              description="Khu vực quản lý dữ liệu khách hàng theo yêu cầu mới của bạn. Schema và API sẽ được thiết kế riêng trước khi ghi dữ liệu vào PostgreSQL."
              backendStatus="Chưa có schema/API"
            />
          }
        />
        <Route
          path="/manager/reports"
          element={
            <ManagerFeaturePage
              eyebrow="UC009 · UC011"
              title="Báo cáo"
              description="Báo cáo doanh thu, tồn kho, thuốc sắp hết hạn và báo cáo AI. Các số liệu chỉ hiển thị khi có nguồn dữ liệu nghiệp vụ thật."
              backendStatus="Chờ UC009/UC011"
            />
          }
        />
        <Route
          path="/manager/ai"
          element={
            <ManagerFeaturePage
              eyebrow="UC010–UC013"
              title="AI Dược sĩ"
              description="Khu vực AI tóm tắt thông tin thuốc, báo cáo hạn dùng và chatbot quy trình nội bộ với Scope Guard bắt buộc."
              backendStatus="AI provider chưa cấu hình"
            />
          }
        />
        <Route
          path="/manager/users"
          element={
            <ManagerFeaturePage
              eyebrow="Yêu cầu bổ sung"
              title="Người dùng"
              description="Quản lý tài khoản Quản lý, Dược sĩ và Khách hàng. Chức năng thay đổi role hoặc trạng thái tài khoản sẽ chỉ mở khi backend enforce đầy đủ."
              backendStatus="Chưa tích hợp API quản trị"
            />
          }
        />
        <Route
          path="/manager/audit"
          element={
            <ManagerFeaturePage
              eyebrow="Security"
              title="Audit Log"
              description="Xem lịch sử hành động quan trọng. Backend đã có audit foundation; giao diện truy vấn và permission đọc log chưa được công bố."
              backendStatus="Audit foundation có sẵn"
            />
          }
        />
        <Route
          path="/manager/profile"
          element={
            <ManagerFeaturePage
              eyebrow="Tài khoản"
              title="Hồ sơ"
              description="Thông tin tài khoản và các thiết lập hồ sơ của Quản lý. Chưa tự thêm trường cá nhân khi chưa có yêu cầu dữ liệu cụ thể."
              backendStatus="Chờ profile API"
            />
          }
        />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
