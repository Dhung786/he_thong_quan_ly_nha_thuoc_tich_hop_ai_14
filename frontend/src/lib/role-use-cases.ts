export type UseCaseStatus = "ready" | "partial" | "pending";

export interface RoleUseCase {
  id: string;
  name: string;
  description: string;
  to: string;
  status: UseCaseStatus;
}

export const managerUseCases: RoleUseCase[] = [
  { id: "UC001", name: "Đăng nhập và phân quyền", description: "Đăng nhập, xác định vai trò và hiển thị giao diện phù hợp.", to: "/dashboard", status: "ready" },
  { id: "UC002", name: "Quản lý danh mục thuốc", description: "Quản lý thuốc, nhóm thuốc và đơn vị tính.", to: "/catalog", status: "partial" },
  { id: "UC003", name: "Quản lý lô nhập", description: "Quản lý lô nhập, hạn sử dụng, giá nhập, giá bán và số lượng.", to: "/manager/imports", status: "pending" },
  { id: "UC004", name: "Bán thuốc và lập hóa đơn", description: "Chọn thuốc, kiểm tra tồn, tính tiền và tạo hóa đơn.", to: "/manager/sales", status: "pending" },
  { id: "UC005", name: "Quản lý nhà cung cấp", description: "Thêm, sửa, tra cứu và cập nhật thông tin nhà cung cấp.", to: "/manager/imports", status: "pending" },
  { id: "UC006", name: "Quản lý và kiểm tra tồn kho", description: "Theo dõi tồn kho và phát hiện thuốc dưới ngưỡng.", to: "/manager/inventory", status: "pending" },
  { id: "UC007", name: "Tra cứu thuốc", description: "Tra cứu theo tên, nhóm, lô hoặc hạn dùng.", to: "/manager/lookup", status: "partial" },
  { id: "UC008", name: "Cảnh báo thuốc sắp hết hạn", description: "Phát hiện và hiển thị các thuốc/lô sắp hết hạn.", to: "/manager/expiry", status: "pending" },
  { id: "UC009", name: "Thống kê và báo cáo", description: "Báo cáo doanh thu, tồn kho và thuốc sắp hết hạn.", to: "/manager/reports", status: "pending" },
  { id: "UC010", name: "AI tóm tắt thông tin thuốc", description: "Tóm tắt dữ liệu thuốc đã được lưu và duyệt trong hệ thống.", to: "/manager/ai", status: "pending" },
  { id: "UC011", name: "AI báo cáo thuốc sắp hết hạn", description: "AI tổng hợp danh sách sắp hết hạn và đề xuất xử lý nghiệp vụ.", to: "/manager/ai", status: "pending" },
  { id: "UC012", name: "Chatbot hỏi đáp quy trình nội bộ", description: "Tra cứu quy trình nội bộ từ nguồn dữ liệu đã cung cấp.", to: "/manager/ai", status: "pending" },
  { id: "UC013", name: "Kiểm soát phạm vi phản hồi AI", description: "Chặn chẩn đoán, kê đơn và phản hồi vượt phạm vi dữ liệu cho phép.", to: "/manager/ai", status: "pending" },
];

export const pharmacistUseCases: RoleUseCase[] = [
  { id: "UC001", name: "Đăng nhập và phân quyền", description: "Đăng nhập và hiển thị đúng giao diện Dược sĩ.", to: "/dashboard", status: "ready" },
  { id: "UC005", name: "Quản lý nhà cung cấp", description: "Tra cứu và cập nhật thông tin nhà cung cấp theo quyền được cấp.", to: "/pharmacist/suppliers", status: "pending" },
  { id: "UC006", name: "Quản lý và kiểm tra tồn kho", description: "Xem tồn kho, ngưỡng tồn tối thiểu và cảnh báo tồn thấp.", to: "/pharmacist/inventory", status: "pending" },
  { id: "UC007", name: "Tra cứu thuốc", description: "Tra cứu thông tin thuốc và xem chi tiết theo phạm vi được phép.", to: "/pharmacist/medicines", status: "ready" },
  { id: "UC008", name: "Cảnh báo thuốc sắp hết hạn", description: "Theo dõi danh sách thuốc/lô sắp hết hạn và cần xử lý.", to: "/pharmacist/alerts", status: "pending" },
  { id: "UC009", name: "Thống kê và báo cáo", description: "Xem báo cáo nghiệp vụ theo phạm vi quyền Dược sĩ.", to: "/pharmacist/reports", status: "pending" },
  { id: "UC010", name: "AI tóm tắt thông tin thuốc", description: "Tóm tắt thông tin thuốc từ dữ liệu đã được duyệt.", to: "/pharmacist/ai", status: "pending" },
  { id: "UC011", name: "AI báo cáo thuốc sắp hết hạn", description: "AI hỗ trợ tổng hợp danh sách thuốc sắp hết hạn để tham khảo.", to: "/pharmacist/ai", status: "pending" },
  { id: "UC012", name: "Chatbot hỏi đáp quy trình nội bộ", description: "Hỏi đáp quy trình nhập lô, kiểm kê và xử lý hàng hết hạn.", to: "/pharmacist/process", status: "pending" },
  { id: "UC013", name: "Kiểm soát phạm vi phản hồi AI", description: "AI chỉ trả lời trong dữ liệu cho phép và từ chối yêu cầu vượt phạm vi.", to: "/pharmacist/ai", status: "pending" },
];
