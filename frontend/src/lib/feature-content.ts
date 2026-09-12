export interface FeatureContent {
  actions: string[];
  fields: string[];
  columns: string[];
  note?: string;
}

export const managerFeatureContent: Record<string, FeatureContent> = {
  "Quản lý nhập thuốc": {
    actions: ["Thêm lô nhập", "Tra cứu lô", "Cập nhật lô", "Quản lý nhà cung cấp"],
    fields: ["Mã lô", "Thuốc", "Nhà cung cấp", "Số lượng", "Ngày nhập", "Hạn sử dụng", "Giá nhập", "Giá bán"],
    columns: ["Mã lô", "Thuốc", "Nhà cung cấp", "Số lượng", "Hạn sử dụng", "Trạng thái"],
  },
  "Bán thuốc": {
    actions: ["Tìm thuốc", "Kiểm tra tồn", "Thêm vào hóa đơn", "Xác nhận giao dịch"],
    fields: ["Thuốc", "Số lượng", "Tồn khả dụng", "Đơn giá", "Thành tiền"],
    columns: ["Thuốc", "Số lượng", "Đơn giá", "Thành tiền"],
  },
  "Tồn kho": {
    actions: ["Xem tồn kho", "Lọc tồn thấp", "Tra cứu theo lô"],
    fields: ["Thuốc", "Mã lô", "Tồn hiện tại", "Ngưỡng tối thiểu", "Trạng thái"],
    columns: ["Thuốc", "Lô", "Tồn", "Ngưỡng tối thiểu", "Trạng thái"],
  },
  "Hạn sử dụng": {
    actions: ["Xem sắp hết hạn", "Xem đã hết hạn", "Lọc theo khoảng ngày"],
    fields: ["Thuốc", "Mã lô", "Hạn sử dụng", "Số ngày còn lại", "Trạng thái"],
    columns: ["Thuốc", "Lô", "Hạn sử dụng", "Còn lại", "Trạng thái"],
  },
  "Tra cứu thuốc": {
    actions: ["Tìm kiếm", "Lọc theo nhóm", "Xem chi tiết"],
    fields: ["Tên hoặc mã thuốc", "Nhóm thuốc", "Mã lô", "Hạn sử dụng"],
    columns: ["Mã thuốc", "Tên thuốc", "Nhóm", "Đơn vị tính", "Lô gần nhất"],
  },
  "Báo cáo - Thống kê": {
    actions: ["Báo cáo doanh thu", "Báo cáo tồn kho", "Báo cáo hạn dùng"],
    fields: ["Loại báo cáo", "Từ ngày", "Đến ngày", "Bộ lọc"],
    columns: ["Chỉ số", "Giá trị", "Khoảng thời gian", "Ghi chú"],
  },
  "Trợ lý AI": {
    actions: ["Tóm tắt thông tin thuốc", "Báo cáo thuốc sắp hết hạn", "Hỏi quy trình nội bộ"],
    fields: ["Thuốc cần tham khảo", "Danh sách cần phân tích", "Câu hỏi quy trình"],
    columns: ["Chức năng", "Nguồn dữ liệu", "Trạng thái", "Kết quả"],
    note: "Kết quả AI chỉ mang tính tham khảo. AI không được chẩn đoán, kê đơn hoặc tự thay đổi dữ liệu nghiệp vụ.",
  },
  "Tài khoản / Phân quyền": {
    actions: ["Tạo tài khoản", "Đổi vai trò", "Khóa / Mở khóa", "Đặt lại mật khẩu"],
    fields: ["Tên đăng nhập", "Vai trò", "Trạng thái tài khoản"],
    columns: ["Tài khoản", "Vai trò", "Trạng thái", "Thao tác"],
  },
};

export const pharmacistFeatureContent: Record<string, FeatureContent> = {
  "Tồn kho & lô thuốc": {
    actions: ["Xem tồn kho", "Lọc tồn thấp", "Tra cứu lô"],
    fields: ["Thuốc", "Mã lô", "Tồn hiện tại", "Ngưỡng tối thiểu", "Hạn sử dụng"],
    columns: ["Thuốc", "Lô", "Tồn", "Hạn sử dụng", "Trạng thái"],
  },
  "Nhà cung cấp": {
    actions: ["Xem danh sách", "Tra cứu", "Lọc có liên hệ"],
    fields: ["Tên nhà cung cấp", "Số điện thoại", "Địa chỉ", "Ghi chú"],
    columns: ["Nhà cung cấp", "Liên hệ", "Địa chỉ", "Trạng thái"],
    note: "Dược sĩ được tra cứu nhà cung cấp. Thêm và cập nhật nhà cung cấp vẫn thuộc quyền Quản lý.",
  },
  "Cảnh báo": {
    actions: ["Xem tồn thấp", "Xem sắp hết hạn", "Xem đã hết hạn"],
    fields: ["Thuốc", "Mã lô", "Hạn sử dụng", "Mức cảnh báo"],
    columns: ["Thuốc", "Lô", "Loại cảnh báo", "Thời điểm", "Trạng thái"],
  },
  "Hỗ trợ bán thuốc": {
    actions: ["Tra cứu thuốc", "Kiểm tra tồn", "Chuẩn bị thông tin tư vấn"],
    fields: ["Thuốc", "Tồn khả dụng", "Số lượng dự kiến", "Ghi chú"],
    columns: ["Thuốc", "Tồn", "Số lượng", "Ghi chú"],
  },
  "AI Dược sĩ": {
    actions: ["Tóm tắt thông tin thuốc", "Xem báo cáo hạn dùng", "Hỏi AI"],
    fields: ["Thuốc cần tham khảo", "Nội dung cần tóm tắt", "Câu hỏi"],
    columns: ["Yêu cầu", "Nguồn dữ liệu", "Trạng thái", "Kết quả"],
    note: "Kết quả AI chỉ dùng để tham khảo. Hệ thống phải từ chối yêu cầu chẩn đoán, kê đơn hoặc chỉ định điều trị vượt phạm vi dữ liệu.",
  },
  "Quy trình nội bộ": {
    actions: ["Hỏi quy trình bán thuốc", "Hỏi quy trình kiểm kê", "Hỏi xử lý thuốc hết hạn"],
    fields: ["Câu hỏi", "Nhóm quy trình", "Nguồn tài liệu"],
    columns: ["Chủ đề", "Nguồn", "Trạng thái", "Kết quả"],
  },
  "Báo cáo": {
    actions: ["Báo cáo tồn kho", "Báo cáo tồn thấp", "Báo cáo thuốc sắp hết hạn"],
    fields: ["Loại báo cáo", "Từ ngày", "Đến ngày"],
    columns: ["Chỉ số", "Giá trị", "Khoảng thời gian", "Ghi chú"],
  },
  "Hồ sơ": {
    actions: ["Xem thông tin"],
    fields: ["Tên đăng nhập", "Vai trò", "Trạng thái tài khoản"],
    columns: ["Thông tin", "Giá trị"],
    note: "Chức năng đổi mật khẩu sẽ chỉ bật khi có API đổi mật khẩu cho chính tài khoản Dược sĩ.",
  },
};
