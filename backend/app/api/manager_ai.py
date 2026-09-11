from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.config import settings
from app.core.database import get_db
from app.models.auth import User
from app.models.catalog import Medicine, MedicineGroup, Unit
from app.models.operational import MedicineBatch
from app.schemas.ai import (
    AIStatusResponse,
    AITextResponse,
    ExpiryReportRequest,
    InternalChatRequest,
    MedicineSummaryRequest,
)
from app.services.ai_provider import (
    AIProviderFailure,
    AIProviderUnavailable,
    generate_ai_text,
    provider_is_configured,
)
from app.services.ai_scope_guard import (
    safe_scope_rejection,
    validate_ai_output,
    validate_internal_chat_input,
)

router = APIRouter(prefix="/api/v1/manager/ai", tags=["manager-ai"])
ManagerUser = Annotated[User, Depends(require_roles("MANAGER"))]
DbSession = Annotated[AsyncSession, Depends(get_db)]

DISCLAIMER = (
    "Nội dung AI chỉ dùng để tham khảo trong quản lý nhà thuốc; không thay thế quyết định chuyên môn "
    "của dược sĩ hoặc bác sĩ và không tự động thay đổi dữ liệu nghiệp vụ."
)

SYSTEM_SAFETY = """
Bạn là trợ lý AI của hệ thống quản lý nhà thuốc. Chỉ trả lời dựa trên dữ liệu và ngữ cảnh được cung cấp.
Không chẩn đoán bệnh, không kê đơn, không đề xuất liều dùng cá nhân, không tuyên bố thay thế bác sĩ/dược sĩ.
Không được nói rằng bạn đã thay đổi tồn kho, lô thuốc, hóa đơn, tài khoản hoặc cơ sở dữ liệu.
Nếu thiếu dữ liệu, hãy nói rõ là chưa đủ dữ liệu. Trả lời ngắn gọn, có cấu trúc, bằng tiếng Việt.
""".strip()


def _provider_error(exc: Exception) -> HTTPException:
    if isinstance(exc, AIProviderUnavailable):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI provider is not configured",
        )
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="AI provider request failed",
    )


def _safe_response(text: str, provider: str, model: str | None) -> AITextResponse:
    decision = validate_ai_output(text)
    if not decision.allowed:
        return AITextResponse(
            answer=safe_scope_rejection(decision.reason),
            provider=provider,
            model=model,
            scope_guard="blocked_output",
            disclaimer=DISCLAIMER,
        )
    return AITextResponse(
        answer=text,
        provider=provider,
        model=model,
        scope_guard="passed",
        disclaimer=DISCLAIMER,
    )


@router.get("/status", response_model=AIStatusResponse)
async def ai_status(_: ManagerUser) -> AIStatusResponse:
    return AIStatusResponse(
        provider=settings.ai_provider,
        model=settings.ai_model,
        configured=provider_is_configured(),
        scope_guard="enabled",
    )


@router.post("/medicine-summary", response_model=AITextResponse)
async def medicine_summary(
    payload: MedicineSummaryRequest,
    _: ManagerUser,
    session: DbSession,
) -> AITextResponse:
    medicine_result = await session.execute(
        select(Medicine, MedicineGroup, Unit)
        .join(MedicineGroup, Medicine.group_id == MedicineGroup.id)
        .join(Unit, Medicine.unit_id == Unit.id)
        .where(Medicine.id == payload.medicine_id)
    )
    row = medicine_result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Medicine not found")
    medicine, group, unit = row

    batch_result = await session.execute(
        select(MedicineBatch)
        .where(MedicineBatch.medicine_id == medicine.id)
        .order_by(MedicineBatch.expiry_date.asc())
    )
    batches = list(batch_result.scalars().all())
    total_remaining = sum(batch.quantity_remaining for batch in batches)
    active_batches = [batch for batch in batches if batch.quantity_remaining > 0]
    nearest_expiry = min((batch.expiry_date for batch in active_batches), default=None)
    prices = [batch.selling_price for batch in active_batches]

    facts = [
        f"Mã thuốc: {medicine.code}",
        f"Tên thuốc: {medicine.name}",
        f"Nhóm thuốc: {group.name}",
        f"Đơn vị tính: {unit.name}",
        f"Tổng tồn hiện tại: {total_remaining}",
        f"Số lô còn hàng: {len(active_batches)}",
        f"Hạn gần nhất: {nearest_expiry.isoformat() if nearest_expiry else 'chưa có dữ liệu'}",
        (
            f"Khoảng giá bán: {min(prices)} - {max(prices)}"
            if prices
            else "Khoảng giá bán: chưa có dữ liệu"
        ),
    ]
    prompt = (
        "Hãy tóm tắt thông tin quản lý của thuốc dưới đây. Chỉ dùng các dữ liệu đã cung cấp, "
        "không bổ sung công dụng, chỉ định, chống chỉ định hay liều dùng từ kiến thức bên ngoài.\n\n"
        + "\n".join(facts)
    )
    try:
        result = await generate_ai_text(system_prompt=SYSTEM_SAFETY, user_prompt=prompt)
    except (AIProviderUnavailable, AIProviderFailure) as exc:
        raise _provider_error(exc) from exc
    return _safe_response(result.text, result.provider, result.model)


@router.post("/expiry-report", response_model=AITextResponse)
async def expiry_report(
    payload: ExpiryReportRequest,
    _: ManagerUser,
    session: DbSession,
) -> AITextResponse:
    today = date.today()
    cutoff = today + timedelta(days=payload.warning_days)
    result = await session.execute(
        select(MedicineBatch, Medicine)
        .join(Medicine, MedicineBatch.medicine_id == Medicine.id)
        .where(
            MedicineBatch.quantity_remaining > 0,
            MedicineBatch.expiry_date >= today,
            MedicineBatch.expiry_date <= cutoff,
        )
        .order_by(MedicineBatch.expiry_date.asc(), MedicineBatch.code.asc())
    )
    rows = result.all()
    if rows:
        lines = [
            (
                f"- {medicine.code} | {medicine.name} | lô {batch.code} | "
                f"tồn {batch.quantity_remaining} | HSD {batch.expiry_date.isoformat()}"
            )
            for batch, medicine in rows
        ]
    else:
        lines = ["- Không có lô còn hàng nào hết hạn trong khoảng đã chọn."]

    prompt = (
        f"Hãy tạo báo cáo quản lý thuốc sắp hết hạn trong {payload.warning_days} ngày, tính từ {today.isoformat()}. "
        "Nêu số lượng lô cần chú ý, sắp xếp ưu tiên theo ngày hết hạn và gợi ý các bước kiểm tra nội bộ "
        "mà không tự động thay đổi dữ liệu.\n\nDữ liệu:\n"
        + "\n".join(lines)
    )
    try:
        ai_result = await generate_ai_text(system_prompt=SYSTEM_SAFETY, user_prompt=prompt)
    except (AIProviderUnavailable, AIProviderFailure) as exc:
        raise _provider_error(exc) from exc
    return _safe_response(ai_result.text, ai_result.provider, ai_result.model)


@router.post("/internal-chat", response_model=AITextResponse)
async def internal_chat(
    payload: InternalChatRequest,
    _: ManagerUser,
) -> AITextResponse:
    decision = validate_internal_chat_input(payload.message)
    if not decision.allowed:
        return AITextResponse(
            answer=safe_scope_rejection(decision.reason),
            provider=settings.ai_provider,
            model=settings.ai_model,
            scope_guard="blocked_input",
            disclaimer=DISCLAIMER,
        )

    process_context = """
Các phạm vi quy trình được phép giải thích:
- Quản lý danh mục thuốc, nhóm thuốc và đơn vị tính.
- Quản lý nhà cung cấp và lô nhập: số lượng, ngày nhập, hạn sử dụng, giá nhập, giá bán.
- Theo dõi tồn kho và cảnh báo tồn thấp theo ngưỡng do người dùng chọn.
- Theo dõi lô sắp hết hạn hoặc đã hết hạn theo khoảng ngày do người dùng chọn.
- Bán thuốc bằng hóa đơn có chọn lô cụ thể; AI không tự chọn FIFO/FEFO và không tự chốt hóa đơn.
- Báo cáo doanh thu từ hóa đơn đã chốt, tồn kho và hạn sử dụng.
- Quản trị tài khoản theo quyền MANAGER.
AI chỉ giải thích quy trình và không thực hiện thao tác ghi dữ liệu.
""".strip()
    prompt = f"{process_context}\n\nCâu hỏi của Quản lý: {payload.message}"
    try:
        result = await generate_ai_text(system_prompt=SYSTEM_SAFETY, user_prompt=prompt)
    except (AIProviderUnavailable, AIProviderFailure) as exc:
        raise _provider_error(exc) from exc
    return _safe_response(result.text, result.provider, result.model)
