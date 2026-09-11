export const managerDemoMetrics = {
  revenue: 12850000,
  inventoryUnits: 615,
  lowStockCount: 5,
  expiringCount: 7,
  invoicesToday: 24,
};

export const pharmacistDemoMetrics = {
  expiringLots: 7,
  lowStockMedicines: 5,
  salesSupportRequests: 12,
  alertsToday: 9,
};

const demoMedicinePrices = [15000, 25000, 32000, 45000, 18000, 12000, 28000, 36000];

export function demoMedicinePrice(medicineId: number): number {
  const index = Math.abs(medicineId - 1) % demoMedicinePrices.length;
  return demoMedicinePrices[index];
}

export function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export interface DemoFeatureData {
  fieldValues: Record<string, string>;
  rows: string[][];
}

export const managerDemoFeatureData: Record<string, DemoFeatureData> = {
  "Quản lý nhập thuốc": {
    fieldValues: {
      "Mã lô": "LO-2026-0912-01",
      "Thuốc": "Amoxicillin 500mg",
      "Nhà cung cấp": "Công ty Dược An Khang",
      "Số lượng": "120 hộp",
      "Ngày nhập": "12/09/2026",
      "Hạn sử dụng": "30/06/2027",
      "Giá nhập": "21.000 đ",
      "Giá bán": "25.000 đ",
    },
    rows: [
      ["LO-260901", "Amoxicillin 500mg", "Dược An Khang", "120", "30/06/2027", "Còn hạn"],
      ["LO-260902", "Paracetamol 500mg", "Dược Minh Tâm", "240", "15/03/2027", "Còn hạn"],
      ["LO-260815", "Siro ho thảo dược", "Dược Việt Phúc", "18", "20/10/2026", "Sắp hết hạn"],
    ],
  },
  "Bán thuốc": {
    fieldValues: {
      "Thuốc": "Paracetamol 500mg",
      "Số lượng": "2 hộp",
      "Tồn khả dụng": "86 hộp",
      "Đơn giá": "15.000 đ",
      "Thành tiền": "30.000 đ",
    },
    rows: [
      ["Paracetamol 500mg", "2", "15.000 đ", "30.000 đ"],
      ["Vitamin C 500mg", "1", "32.000 đ", "32.000 đ"],
      ["Amoxicillin 500mg", "1", "25.000 đ", "25.000 đ"],
    ],
  },
  "Tồn kho": {
    fieldValues: {
      "Thuốc": "Amoxicillin 500mg",
      "Mã lô": "LO-260901",
      "Tồn hiện tại": "35 hộp",
      "Ngưỡng tối thiểu": "40 hộp",
      "Trạng thái": "Tồn thấp",
    },
    rows: [
      ["Amoxicillin 500mg", "LO-260901", "35", "40", "Tồn thấp"],
      ["Paracetamol 500mg", "LO-260902", "86", "30", "An toàn"],
      ["Siro ho thảo dược", "LO-260815", "18", "25", "Tồn thấp"],
    ],
  },
  "Hạn sử dụng": {
    fieldValues: {
      "Thuốc": "Siro ho thảo dược",
      "Mã lô": "LO-260815",
      "Hạn sử dụng": "20/10/2026",
      "Số ngày còn lại": "38 ngày",
      "Trạng thái": "Sắp hết hạn",
    },
    rows: [
      ["Siro ho thảo dược", "LO-260815", "20/10/2026", "38 ngày", "Sắp hết hạn"],
      ["Vitamin C 500mg", "LO-260821", "05/11/2026", "54 ngày", "Sắp hết hạn"],
      ["Amoxicillin 500mg", "LO-260901", "30/06/2027", "291 ngày", "Còn hạn"],
    ],
  },
  "Tra cứu thuốc": {
    fieldValues: {
      "Tên hoặc mã thuốc": "Paracetamol 500mg",
      "Nhóm thuốc": "Giảm đau - hạ sốt",
      "Mã lô": "LO-260902",
      "Hạn sử dụng": "15/03/2027",
    },
    rows: [
      ["PAR-500", "Paracetamol 500mg", "Giảm đau - hạ sốt", "Hộp", "LO-260902"],
      ["AMO-500", "Amoxicillin 500mg", "Kháng sinh", "Hộp", "LO-260901"],
      ["VIT-C", "Vitamin C 500mg", "Vitamin", "Hộp", "LO-260821"],
    ],
  },
  "Báo cáo - Thống kê": {
    fieldValues: {
      "Loại báo cáo": "Doanh thu",
      "Từ ngày": "01/09/2026",
      "Đến ngày": "12/09/2026",
      "Bộ lọc": "Tất cả thuốc",
    },
    rows: [
      ["Doanh thu", "12.850.000 đ", "01/09 - 12/09/2026", "Dữ liệu demo"],
      ["Số hóa đơn", "184", "01/09 - 12/09/2026", "Dữ liệu demo"],
      ["Thuốc tồn thấp", "5", "Hiện tại", "Dữ liệu demo"],
    ],
  },
  "Trợ lý AI": {
    fieldValues: {
      "Thuốc cần tham khảo": "Amoxicillin 500mg",
      "Danh sách cần phân tích": "7 lô sắp hết hạn",
      "Câu hỏi quy trình": "Quy trình xử lý thuốc sắp hết hạn?",
    },
    rows: [
      ["Tóm tắt thông tin thuốc", "Danh mục thuốc", "Sẵn sàng giao diện", "Chờ AI provider"],
      ["Báo cáo hạn dùng", "Dữ liệu demo", "Sẵn sàng giao diện", "7 lô cần chú ý"],
      ["Chatbot nội bộ", "Quy trình nội bộ", "Sẵn sàng giao diện", "Chờ AI provider"],
    ],
  },
  "Tài khoản / Phân quyền": {
    fieldValues: {
      "Tên đăng nhập": "pharmacist",
      "Vai trò": "Dược sĩ",
      "Trạng thái tài khoản": "Đang hoạt động",
    },
    rows: [
      ["manager", "Quản lý", "Hoạt động", "—"],
      ["pharmacist", "Dược sĩ", "Hoạt động", "—"],
      ["customer", "Khách hàng", "Hoạt động", "—"],
    ],
  },
};

export const pharmacistDemoFeatureData: Record<string, DemoFeatureData> = {
  "Tồn kho & lô thuốc": {
    fieldValues: {
      "Thuốc": "Amoxicillin 500mg",
      "Mã lô": "LO-260901",
      "Tồn hiện tại": "35 hộp",
      "Ngưỡng tối thiểu": "40 hộp",
      "Hạn sử dụng": "30/06/2027",
    },
    rows: [
      ["Amoxicillin 500mg", "LO-260901", "35", "30/06/2027", "Tồn thấp"],
      ["Paracetamol 500mg", "LO-260902", "86", "15/03/2027", "An toàn"],
      ["Siro ho thảo dược", "LO-260815", "18", "20/10/2026", "Sắp hết hạn"],
    ],
  },
  "Nhà cung cấp": {
    fieldValues: {
      "Tên nhà cung cấp": "Công ty Dược An Khang",
      "Số điện thoại": "0208 376 8899",
      "Địa chỉ": "Thái Nguyên",
      "Ghi chú": "Nhà cung cấp demo",
    },
    rows: [
      ["Dược An Khang", "0208 376 8899", "Thái Nguyên", "Đang hợp tác"],
      ["Dược Minh Tâm", "024 3765 2211", "Hà Nội", "Đang hợp tác"],
      ["Dược Việt Phúc", "028 3911 2288", "TP.HCM", "Đang hợp tác"],
    ],
  },
  "Cảnh báo": {
    fieldValues: {
      "Thuốc": "Siro ho thảo dược",
      "Mã lô": "LO-260815",
      "Hạn sử dụng": "20/10/2026",
      "Mức cảnh báo": "Cao",
    },
    rows: [
      ["Amoxicillin 500mg", "LO-260901", "Tồn thấp", "12/09/2026", "Cần xử lý"],
      ["Siro ho thảo dược", "LO-260815", "Sắp hết hạn", "12/09/2026", "Cần chú ý"],
      ["Vitamin C 500mg", "LO-260821", "Sắp hết hạn", "12/09/2026", "Theo dõi"],
    ],
  },
  "Hỗ trợ bán thuốc": {
    fieldValues: {
      "Thuốc": "Paracetamol 500mg",
      "Tồn khả dụng": "86 hộp",
      "Số lượng dự kiến": "2 hộp",
      "Ghi chú": "Giá bán demo: 15.000 đ/hộp",
    },
    rows: [
      ["Paracetamol 500mg", "86", "2", "15.000 đ/hộp"],
      ["Vitamin C 500mg", "64", "1", "32.000 đ/hộp"],
      ["Amoxicillin 500mg", "35", "1", "25.000 đ/hộp"],
    ],
  },
  "AI Dược sĩ": {
    fieldValues: {
      "Thuốc cần tham khảo": "Amoxicillin 500mg",
      "Nội dung cần tóm tắt": "Thông tin sử dụng và bảo quản",
      "Câu hỏi": "Những điểm nào cần lưu ý khi bảo quản?",
    },
    rows: [
      ["Tóm tắt thuốc", "Danh mục thuốc", "Giao diện sẵn sàng", "Chờ AI provider"],
      ["Báo cáo hạn dùng", "Dữ liệu demo", "Giao diện sẵn sàng", "7 lô cần chú ý"],
      ["Hỏi AI", "Câu hỏi người dùng", "Giao diện sẵn sàng", "Chờ AI provider"],
    ],
  },
  "Quy trình nội bộ": {
    fieldValues: {
      "Câu hỏi": "Xử lý thuốc sắp hết hạn như thế nào?",
      "Nhóm quy trình": "Hạn sử dụng",
      "Nguồn tài liệu": "Quy trình nội bộ demo",
    },
    rows: [
      ["Bán thuốc", "Quy trình nội bộ", "Có mẫu demo", "Mở chatbot để hỏi"],
      ["Kiểm kê", "Quy trình nội bộ", "Có mẫu demo", "Mở chatbot để hỏi"],
      ["Thuốc hết hạn", "Quy trình nội bộ", "Có mẫu demo", "Mở chatbot để hỏi"],
    ],
  },
  "Báo cáo": {
    fieldValues: {
      "Loại báo cáo": "Tồn kho",
      "Từ ngày": "01/09/2026",
      "Đến ngày": "12/09/2026",
    },
    rows: [
      ["Tổng tồn kho", "615 đơn vị", "12/09/2026", "Dữ liệu demo"],
      ["Thuốc tồn thấp", "5", "12/09/2026", "Dữ liệu demo"],
      ["Lô sắp hết hạn", "7", "90 ngày tới", "Dữ liệu demo"],
    ],
  },
  "Hồ sơ": {
    fieldValues: {
      "Tên đăng nhập": "pharmacist",
      "Vai trò": "Dược sĩ",
      "Trạng thái tài khoản": "Đang hoạt động",
    },
    rows: [
      ["Tên đăng nhập", "pharmacist"],
      ["Vai trò", "Dược sĩ"],
      ["Trạng thái", "Đang hoạt động"],
    ],
  },
};
