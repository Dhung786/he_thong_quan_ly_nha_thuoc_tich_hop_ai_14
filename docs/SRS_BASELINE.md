# SRS baseline — Hệ thống quản lý nhà thuốc có tích hợp AI, Nhóm 14

## Nguồn chuẩn

Baseline chức năng hiện tại là tài liệu **Đặc tả yêu cầu ứng dụng – V1.0, Hệ thống quản lý nhà thuốc có tích hợp AI – Nhóm 14** do người dùng cung cấp và xác nhận dùng làm chuẩn thay cho baseline kho cũ.

## Tác nhân

SRS xác định ba tác nhân:

- Quản lý → technical role `MANAGER`
- Dược sĩ → technical role `PHARMACIST`
- Thu ngân → technical role `CASHIER`

Technical role code chỉ là mã nội bộ; giao diện giữ tên tác nhân theo SRS.

## Danh sách Use Case

- UC001 — Đăng nhập và phân quyền
- UC002 — Quản lý danh mục thuốc
- UC003 — Quản lý lô nhập
- UC004 — Bán thuốc và lập hóa đơn
- UC005 — Quản lý nhà cung cấp
- UC006 — Quản lý và kiểm tra tồn kho
- UC007 — Tra cứu thuốc
- UC008 — Cảnh báo thuốc sắp hết hạn
- UC009 — Thống kê và báo cáo
- UC010 — AI tóm tắt thông tin thuốc
- UC011 — AI báo cáo thuốc sắp hết hạn
- UC012 — Chatbot hỏi đáp quy trình nội bộ
- UC013 — Kiểm soát phạm vi phản hồi AI

## UC002 — phần đã đủ rõ để triển khai

SRS xác định UC002 có tác nhân **Quản lý** và cho phép thêm, sửa, xóa, tra cứu thông tin thuốc, nhóm thuốc và đơn vị tính. Thuốc có tối thiểu các trường được nêu cụ thể:

- mã thuốc;
- tên thuốc;
- nhóm thuốc;
- đơn vị tính.

Ràng buộc được nêu cụ thể:

- mã thuốc đã tồn tại → yêu cầu mã khác;
- thiếu thông tin bắt buộc → yêu cầu bổ sung;
- thuốc đang được sử dụng trong lô hàng hoặc hóa đơn → không được xóa trực tiếp;
- lỗi lưu dữ liệu → thông báo lỗi.

Các trường “thông tin cần thiết khác” chưa được định nghĩa nên chưa được tự bổ sung vào schema.

## Mâu thuẫn/điểm chưa rõ giữ nguyên, không tự sửa

1. Mô tả tác nhân nói **Thu ngân** thực hiện bán thuốc và lập hóa đơn, nhưng bảng mapping tác nhân → Use Case không gán UC004 cho Thu ngân.
2. UC005 chi tiết ghi tác nhân **Quản lý, Dược sĩ, Thu ngân**, nhưng bảng mapping phía trên không gán UC005 cho Quản lý và lại gán UC005 cho Dược sĩ/Thu ngân.
3. UC004 chi tiết ghi tác nhân Quản lý, trong khi mô tả tác nhân Thu ngân nói Thu ngân thực hiện bán thuốc/lập hóa đơn.

Các quyền liên quan UC004/UC005 phải được làm rõ trước khi khóa permission contract của hai Use Case này.

## Trạng thái triển khai

- UC001: foundation đã có, chuyển role sang baseline nhà thuốc.
- UC002: đang triển khai backend + frontend + migration + tests.
- UC003–UC013: chưa triển khai trong baseline branch này.
