export interface ManagerInputConfig {
  fields: string[];
}

export const managerInputConfig: Record<string, ManagerInputConfig> = {
  "Quản lý nhập thuốc": {
    fields: [
      "Mã lô",
      "Thuốc",
      "Nhà cung cấp",
      "Số lượng",
      "Ngày nhập",
      "Hạn sử dụng",
      "Giá nhập",
      "Giá bán",
      "Trạng thái",
    ],
  },
  "Bán thuốc": {
    fields: ["Thuốc", "Số lượng", "Tồn khả dụng", "Đơn giá", "Thành tiền"],
  },
  "Tồn kho": {
    fields: ["Thuốc", "Mã lô", "Tồn hiện tại", "Ngưỡng tối thiểu", "Trạng thái"],
  },
  "Hạn sử dụng": {
    fields: ["Thuốc", "Mã lô", "Hạn sử dụng", "Số ngày còn lại", "Trạng thái"],
  },
  "Tra cứu thuốc": {
    fields: ["Mã thuốc", "Tên thuốc", "Nhóm", "Đơn vị tính", "Lô gần nhất"],
  },
  "Báo cáo - Thống kê": {
    fields: ["Chỉ số", "Giá trị", "Khoảng thời gian", "Ghi chú"],
  },
  "Trợ lý AI": {
    fields: ["Chức năng", "Nguồn dữ liệu", "Trạng thái", "Kết quả"],
  },
  "Tài khoản / Phân quyền": {
    fields: ["Tài khoản", "Vai trò", "Trạng thái", "Thao tác"],
  },
};

export function valueForManagerColumn(column: string, values: Record<string, string>): string {
  const aliases: Record<string, string[]> = {
    "Lô": ["Lô", "Mã lô"],
    "Tồn": ["Tồn", "Tồn hiện tại", "Tồn khả dụng"],
    "Còn lại": ["Còn lại", "Số ngày còn lại"],
    "Mã thuốc": ["Mã thuốc"],
    "Tên thuốc": ["Tên thuốc", "Thuốc"],
    "Nhóm": ["Nhóm", "Nhóm thuốc"],
    "ĐVT": ["ĐVT", "Đơn vị tính"],
    "Lô gần nhất": ["Lô gần nhất", "Mã lô"],
    "Tài khoản": ["Tài khoản", "Tên đăng nhập"],
  };

  const candidates = aliases[column] ?? [column];
  for (const key of candidates) {
    const value = values[key];
    if (value?.trim()) return value.trim();
  }
  return "—";
}
