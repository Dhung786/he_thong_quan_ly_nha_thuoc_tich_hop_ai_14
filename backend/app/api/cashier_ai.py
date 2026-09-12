from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import require_roles
from app.core.config import settings
from app.models.auth import User
from app.schemas.ai import AITextResponse, InternalChatRequest
from app.services.ai_provider import (
    AIProviderFailure,
    AIProviderUnavailable,
    generate_ai_text,
)
from app.services.ai_scope_guard import (
    safe_scope_rejection,
    validate_ai_output,
    validate_internal_chat_input,
)

router = APIRouter(prefix="/api/v1/cashier/assistant", tags=["cashier-assistant"])
CashierUser = Annotated[User, Depends(require_roles("CASHIER"))]

DISCLAIMER = (
    "AI chỉ hỗ trợ quy trình nghiệp vụ Thu ngân. Không chẩn đoán, kê đơn, chỉ định liều dùng "
    "và không tự động thay đổi hóa đơn, tồn kho hoặc dữ liệu hệ thống."
)

SYSTEM_PROMPT = """
Bạn là trợ lý nghiệp vụ dành riêng cho Thu ngân trong hệ thống quản lý nhà thuốc.
Chỉ hỗ trợ các chủ đề: thao tác bán hàng tại quầy, quét/tìm mã thuốc hoặc mã lô, chọn lô theo FEFO,
kiểm tra tồn, kiểm tra hạn dùng, tạo/hủy hóa đơn nháp, thanh toán, in hóa đơn, tra cứu hóa đơn và tổng kết ca.
Không chẩn đoán, không kê đơn, không tư vấn liều dùng hoặc điều trị. Khi câu hỏi cần chuyên môn dược,
hãy hướng dẫn Thu ngân chuyển khách hàng sang Dược sĩ. Không tuyên bố đã thay đổi dữ liệu hệ thống.
Trả lời ngắn gọn, theo từng bước, bằng tiếng Việt.
""".strip()


@router.post("", response_model=AITextResponse)
async def cashier_assistant(payload: InternalChatRequest, _: CashierUser) -> AITextResponse:
    decision = validate_internal_chat_input(payload.message)
    if not decision.allowed:
        return AITextResponse(
            answer=safe_scope_rejection(decision.reason),
            provider=settings.ai_provider,
            model=settings.ai_model,
            scope_guard="blocked_input",
            disclaimer=DISCLAIMER,
        )

    try:
        result = await generate_ai_text(system_prompt=SYSTEM_PROMPT, user_prompt=payload.message)
    except AIProviderUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI provider is not configured",
        ) from exc
    except AIProviderFailure as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider request failed",
        ) from exc

    output_decision = validate_ai_output(result.text)
    if not output_decision.allowed:
        return AITextResponse(
            answer=safe_scope_rejection(output_decision.reason),
            provider=result.provider,
            model=result.model,
            scope_guard="blocked_output",
            disclaimer=DISCLAIMER,
        )

    return AITextResponse(
        answer=result.text,
        provider=result.provider,
        model=result.model,
        scope_guard="passed",
        disclaimer=DISCLAIMER,
    )
