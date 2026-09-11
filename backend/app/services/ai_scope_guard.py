from dataclasses import dataclass


@dataclass(frozen=True)
class ScopeDecision:
    allowed: bool
    reason: str


_ALLOWED_INTERNAL_TOPICS = (
    "thuốc",
    "lô",
    "hạn sử dụng",
    "hết hạn",
    "tồn kho",
    "nhập thuốc",
    "nhà cung cấp",
    "bán thuốc",
    "hóa đơn",
    "kiểm kê",
    "quy trình",
    "tài khoản",
    "phân quyền",
    "báo cáo",
)

_BLOCKED_CLINICAL_PATTERNS = (
    "chẩn đoán",
    "tôi bị",
    "bệnh gì",
    "uống bao nhiêu",
    "liều dùng cho tôi",
    "kê đơn",
    "điều trị cho tôi",
    "nên uống thuốc gì",
    "thuốc nào chữa",
)

_BLOCKED_OPERATION_PATTERNS = (
    "tự động xóa",
    "tự động sửa",
    "tự động trừ tồn",
    "tự động nhập kho",
    "tự động chốt hóa đơn",
    "bỏ qua quyền",
    "bỏ qua phân quyền",
)

_BLOCKED_OUTPUT_PATTERNS = (
    "tôi chẩn đoán",
    "tôi kê đơn",
    "liều dùng phù hợp cho bạn",
    "đã tự động trừ tồn",
    "đã tự động chốt hóa đơn",
    "đã cập nhật cơ sở dữ liệu",
)


def validate_internal_chat_input(message: str) -> ScopeDecision:
    normalized = " ".join(message.lower().split())
    if any(pattern in normalized for pattern in _BLOCKED_CLINICAL_PATTERNS):
        return ScopeDecision(False, "clinical_advice_out_of_scope")
    if any(pattern in normalized for pattern in _BLOCKED_OPERATION_PATTERNS):
        return ScopeDecision(False, "operational_write_out_of_scope")
    if not any(topic in normalized for topic in _ALLOWED_INTERNAL_TOPICS):
        return ScopeDecision(False, "outside_pharmacy_internal_scope")
    return ScopeDecision(True, "allowed")


def validate_ai_output(text: str) -> ScopeDecision:
    normalized = " ".join(text.lower().split())
    if any(pattern in normalized for pattern in _BLOCKED_OUTPUT_PATTERNS):
        return ScopeDecision(False, "unsafe_or_operational_output")
    return ScopeDecision(True, "allowed")


def safe_scope_rejection(reason: str) -> str:
    messages = {
        "clinical_advice_out_of_scope": (
            "Yêu cầu này vượt phạm vi trợ lý quản lý nhà thuốc. AI không chẩn đoán, kê đơn "
            "hoặc đưa ra liều dùng cá nhân. Hãy trao đổi với dược sĩ hoặc bác sĩ có chuyên môn."
        ),
        "operational_write_out_of_scope": (
            "AI chỉ hỗ trợ tham khảo và không được tự động thay đổi tồn kho, lô thuốc, hóa đơn "
            "hoặc dữ liệu nghiệp vụ."
        ),
        "outside_pharmacy_internal_scope": (
            "Chatbot này chỉ trả lời các câu hỏi về thuốc, tồn kho, lô nhập, "
            "hạn sử dụng, bán thuốc, hóa đơn, báo cáo và quy trình nội bộ "
            "của hệ thống nhà thuốc."
        ),
        "unsafe_or_operational_output": (
            "Phản hồi AI đã bị Scope Guard chặn vì có nội dung vượt phạm vi an toàn."
        ),
    }
    return messages.get(reason, "Yêu cầu hoặc phản hồi đã bị Scope Guard chặn.")
