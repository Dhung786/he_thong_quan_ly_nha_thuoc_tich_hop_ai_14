# SRS baseline — Hệ thống quản lý nhà thuốc có tích hợp AI, Nhóm 14

## Nguồn chuẩn

Baseline chức năng là tài liệu **Đặc tả yêu cầu ứng dụng – V1.0, Hệ thống quản lý nhà thuốc có tích hợp AI – Nhóm 14**, kết hợp với các quyết định mới hơn được người dùng phê duyệt trực tiếp.

## Level 0 — quyết định người dùng mới nhất

Người dùng đã thay actor **Thu ngân** bằng **Khách hàng**. Vì đây là quyết định mới hơn SRS, hệ thống sử dụng đúng ba role:

- Quản lý → `MANAGER`
- Dược sĩ → `PHARMACIST`
- Khách hàng → `CUSTOMER`

`CASHIER` không còn là role hợp lệ sau migration `0005_customer_role`.

Quyền nghiệp vụ cũ của Thu ngân **không được tự động chuyển sang Khách hàng**. `CUSTOMER` hiện chỉ chắc chắn thuộc UC001 (đăng nhập/phân quyền). Các quyền mua thuốc, xem hóa đơn, tra cứu hoặc chức năng khác phải có quyết định nghiệp vụ riêng trước khi backend mở quyền.

Người dùng cũng đã chốt phạm vi giao diện **Dược sĩ**: thực hiện các nghiệp vụ liên quan đến thuốc, tra cứu thông tin thuốc, hỗ trợ bán thuốc và sử dụng các chức năng AI để tham khảo thông tin và quy trình nội bộ.

Từ quyết định này, permission đã đủ rõ để mở **UC007 tra cứu thuốc dạng read-only** cho `PHARMACIST`. Dược sĩ không kế thừa quyền CRUD danh mục của UC002. Các khu vực hỗ trợ bán thuốc và AI được phép có giao diện theo vai trò, nhưng chỉ thực hiện thao tác backend thật khi UC004/UC010–UC013 tương ứng đã hoàn tất và được kiểm thử.

## Danh sách Use Case baseline

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

## UC001

Authentication foundation hỗ trợ cả ba role hiện tại. Backend là nơi enforce quyền; ẩn menu ở frontend không được xem là security.

## UC002 — phần đủ rõ để triển khai

SRS xác định UC002 có tác nhân **Quản lý** và cho phép thêm, sửa, xóa, tra cứu thông tin thuốc, nhóm thuốc và đơn vị tính. Thuốc có tối thiểu:

- mã thuốc;
- tên thuốc;
- nhóm thuốc;
- đơn vị tính.

Ràng buộc:

- mã thuốc đã tồn tại → yêu cầu mã khác;
- thiếu thông tin bắt buộc → yêu cầu bổ sung;
- thuốc đang được sử dụng trong lô hàng hoặc hóa đơn → không được xóa trực tiếp;
- lỗi lưu dữ liệu → thông báo lỗi.

Các trường “thông tin cần thiết khác” chưa được định nghĩa nên chưa được tự bổ sung vào schema.

## UC007 — tra cứu thuốc cho Dược sĩ

Quyết định người dùng cho phép `PHARMACIST` tra cứu thông tin thuốc. Implementation hiện dùng endpoint read-only riêng, tìm theo mã hoặc tên thuốc và trả về dữ liệu danh mục đã có trong PostgreSQL.

- `MANAGER`: được phép dùng lookup.
- `PHARMACIST`: được phép dùng lookup.
- `CUSTOMER`: chưa được mở quyền lookup.
- Endpoint lookup không cung cấp thao tác thêm/sửa/xóa.

## Mâu thuẫn/điểm cần quyết định

1. UC004 trong SRS cũ mâu thuẫn giữa Quản lý và Thu ngân. Vì Thu ngân đã bị thay bằng Khách hàng, quyền bán thuốc của `CUSTOMER` vẫn **chưa được suy diễn**. Dược sĩ đã được phê duyệt ở mức **hỗ trợ bán thuốc**, nhưng quyền tạo/chốt hóa đơn và cách chọn lô vẫn cần rule cụ thể trước khi backend mutation được mở.
2. UC005 cũ có mapping actor không nhất quán; cần chốt lại quyền của từng role hiện tại trước khi khóa permission contract.
3. Quy tắc chọn lô khi bán chưa được xác định: FEFO, FIFO hay người dùng tự chọn.
4. Khoảng thời gian cảnh báo thuốc sắp hết hạn chưa được xác định.
5. Quyền nghiệp vụ của Khách hàng ngoài UC001 chưa được xác định.

Các điểm trên chỉ block module liên quan, không block UC002 hoặc UC007 read-only đã đủ rõ.

## Trạng thái triển khai

- UC001: IMPLEMENTED; role baseline cập nhật sang `MANAGER / PHARMACIST / CUSTOMER`.
- UC002: IMPLEMENTED trên baseline nhà thuốc cho `MANAGER`.
- UC007 read-only cho `PHARMACIST`: IMPLEMENTED trên branch `feature/pharmacist-workspace-v1`, chờ CI để VERIFIED.
- Giao diện Dược sĩ cho hỗ trợ bán thuốc, AI Dược sĩ và quy trình nội bộ: IMPLEMENTED UI shell, backend tương ứng chưa được coi là hoàn tất.
- UC003–UC006, UC008–UC013: chưa coi là hoàn tất; triển khai tiếp theo phải tuân thủ decision gate của từng module.
