from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
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

router = APIRouter(prefix="/api/v1/pharmacist/ai", tags=["pharmacist-ai"])
PharmacistUser = Annotated[User, Depends(require_roles("PHARMACIST"))]
DbSession = Annotated[AsyncSession, Depends(get_db)]

LOCAL_PROVIDER = "local_safe"
LOCAL_MODEL = "rules-v1"
DISCLAIMER = (
    "Nội dung AI chỉ dùng để tham khảo nghiệp vụ nhà thuốc, không chẩn đoán, kê đơn "
    "hoặc thay thế quyết định chuyên môn của dược sĩ/bác sĩ. AI không tự động thay đổi "
    "tồn kho, lô thuốc hay hóa đơn."
)
SYSTEM_SAFETY = """
Bạn là AI hỗ trợ Dược sĩ trong hệ thống quản lý nhà thuốc.
Chỉ sử dụng dữ liệu được cung cấp từ hệ thống.
Không chẩn đoán bệnh, không kê đơn, không chỉ định liều dùng cá nhân.
Không tuyên bố đã sửa tồn kho, lô thuốc, hóa đơn hoặc cơ sở dữ liệu.
Nếu thiếu dữ liệu, phải nói rõ. Trả lời bằng tiếng Việt, ngắn gọn và có cấu trúc.
""".strip()


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


async def _external_or_local(*, prompt: str, fallback: str) -> AITextResponse:
    if provider_is_configured():
        try:
            result = await generate_ai_text(
                system_prompt=SYSTEM_SAFETY,
                user_prompt=prompt,
            )
            return _safe_response(result.text, result.provider, result.model)
        except (AIProviderUnavailable, AIProviderFailure):
            pass
    return _safe_response(fallback, LOCAL_PROVIDER, LOCAL_MODEL)


@router.get("/status", response_model=AIStatusResponse)
async def ai_status(_: PharmacistUser) -> AIStatusResponse:
    if provider_is_configured():
        return AIStatusResponse(
            provider=settings.ai_provider,
            model=settings.ai_model,
            configured=True,
            scope_guard="enabled",
        )
    return AIStatusResponse(
        provider=LOCAL_PROVIDER,
        model=LOCAL_MODEL,
        configured=True,
        scope_guard="enabled",
    )


@router.post("/medicine-summary", response_model=AITextResponse)
async def medicine_summary(
    payload: MedicineSummaryRequest,
    _: PharmacistUser,
    session: DbSession,
) -> AITextResponse:
    result = await session.execute(
        select(Medicine, MedicineGroup, Unit)
        .join(MedicineGroup, Medicine.group_id == MedicineGroup.id)
        .join(Unit, Medicine.unit_id == Unit.id)
        .where(Medicine.id == payload.medicine_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Medicine not found")
    medicine, group, unit = row

    batches_result = await session.execute(
        select(MedicineBatch)
        .where(MedicineBatch.medicine_id == medicine.id)
        .order_by(MedicineBatch.expiry_date.asc())
    )
    batches = list(batches_result.scalars().all())
    active = [batch for batch in batches if batch.quantity_remaining > 0]
    total_remaining = sum(batch.quantity_remaining for batch in active)
    nearest_expiry = min((batch.expiry_date for batch in active), default=None)
    prices = [batch.selling_price for batch in active]

    facts = [
        f"Mã thuốc: {medicine.code}",
        f"Tên thuốc: {medicine.name}",
        f"Nhóm: {group.name}",
        f"Đơn vị tính: {unit.name}",
        f"Tổng tồn: {total_remaining}",
        f"Số lô còn hàng: {len(active)}",
        f"Hạn gần nhất: {nearest_expiry.isoformat() if nearest_expiry else 'chưa có'}",
        (
            f"Khoảng giá bán: {min(prices)} - {max(prices)}"
            if prices
            else "Khoảng giá bán: chưa có"
        ),
    ]
    prompt = (
        "Tóm tắt thông tin thuốc cho dược sĩ dựa hoàn toàn vào dữ liệu hệ thống sau. "
        "Không bổ sung công dụng, chỉ định, tương tác hoặc liều dùng từ kiến thức ngoài.\n"
        + "\n".join(facts)
    )
    fallback_lines = [
        f"• {medicine.name} ({medicine.code}) thuộc nhóm {group.name}, đơn vị {unit.name}.",
        f"• Tồn hiện tại: {total_remaining}; số lô còn hàng: {len(active)}.",
        (
            f"• Hạn sử dụng gần nhất: {nearest_expiry.isoformat()}."
            if nearest_expiry
            else "• Chưa có lô còn hàng để xác định hạn sử dụng gần nhất."
        ),
        (
            f"• Giá bán theo các lô còn hàng: {min(prices)} đến {max(prices)}."
            if prices
            else "• Chưa có dữ liệu giá bán của lô còn hàng."
        ),
        "• Hệ thống không có dữ liệu lâm sàng để suy diễn công dụng, tương tác hoặc liều dùng.",
    ]
    return await _external_or_local(
        prompt=prompt,
        fallback="\n".join(fallback_lines),
    )


@router.post("/expiry-report", response_model=AITextResponse)
async def expiry_report(
    payload: ExpiryReportRequest,
    _: PharmacistUser,
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
        .order_by(MedicineBatch.expiry_date, MedicineBatch.code)
    )
    rows = result.all()
    data_lines = [
        (
            f"- {medicine.name} ({medicine.code}), lô {batch.code}, "
            f"tồn {batch.quantity_remaining}, HSD {batch.expiry_date.isoformat()}"
        )
        for batch, medicine in rows
    ]
    if not data_lines:
        data_lines = ["- Không có lô còn hàng trong khoảng cảnh báo."]

    prompt = (
        f"Lập báo cáo cho dược sĩ về lô sắp hết hạn trong {payload.warning_days} ngày "
        f"từ {today.isoformat()}. Chỉ dựa trên dữ liệu sau và không tự thay đổi dữ liệu:\n"
        + "\n".join(data_lines)
    )
    if rows:
        fallback = (
            f"Có {len(rows)} lô còn hàng cần chú ý trong {payload.warning_days} ngày.\n"
            + "\n".join(data_lines)
            + "\nƯu tiên kiểm tra các lô có ngày hết hạn gần nhất và xử lý theo quy trình nội bộ."
        )
    else:
        fallback = (
            f"Không có lô còn hàng nào sắp hết hạn trong {payload.warning_days} ngày "
            f"tính từ {today.isoformat()}."
        )
    return await _external_or_local(prompt=prompt, fallback=fallback)


def _local_process_answer(message: str) -> str:
    normalized = " ".join(message.lower().split())
    if "hóa đơn" in normalized or "bán thuốc" in normalized:
        return (
            "Quy trình hỗ trợ bán thuốc: tra cứu thuốc → chọn đúng lô còn hàng và còn hạn → "
            "nhập số lượng → tạo hóa đơn nháp → kiểm tra lại → chốt hóa đơn. "
            "Khi chốt, hệ thống mới trừ tồn theo đúng lô đã chọn."
        )
    if "hết hạn" in normalized or "hạn sử dụng" in normalized:
        return (
            "Mở mục Cảnh báo để xem lô sắp hết hạn và đã hết hạn. Không bán lô đã hết hạn. "
            "Với lô sắp hết hạn, kiểm tra số lượng, ngày HSD và thực hiện quy trình xử lý nội bộ."
        )
    if "tồn kho" in normalized or "kiểm kê" in normalized or "lô" in normalized:
        return (
            "Mở Tồn kho & lô thuốc để kiểm tra tồn theo từng lô, HSD và giá bán. "
            "Dược sĩ có quyền tra cứu; các thao tác quản trị nhập/sửa lô vẫn thuộc Quản lý."
        )
    if "nhà cung cấp" in normalized:
        return (
            "Dược sĩ có thể tra cứu danh sách nhà cung cấp để đối chiếu nguồn lô thuốc. "
            "Thêm hoặc sửa nhà cung cấp thuộc quyền Quản lý."
        )
    if "báo cáo" in normalized:
        return (
            "Mục Báo cáo hiển thị số hóa đơn đã chốt và doanh thu do tài khoản Dược sĩ tạo, "
            "cùng các chỉ số tồn kho và hạn sử dụng phục vụ ca làm việc."
        )
    return (
        "Bạn có thể hỏi về thuốc, lô, tồn kho, hạn sử dụng, bán thuốc, hóa đơn, "
        "nhà cung cấp, kiểm kê hoặc báo cáo trong hệ thống."
    )


@router.post("/internal-chat", response_model=AITextResponse)
async def internal_chat(
    payload: InternalChatRequest,
    _: PharmacistUser,
) -> AITextResponse:
    decision = validate_internal_chat_input(payload.message)
    if not decision.allowed:
        return AITextResponse(
            answer=safe_scope_rejection(decision.reason),
            provider=(settings.ai_provider if provider_is_configured() else LOCAL_PROVIDER),
            model=(settings.ai_model if provider_is_configured() else LOCAL_MODEL),
            scope_guard="blocked_input",
            disclaimer=DISCLAIMER,
        )

    prompt = (
        "Trả lời câu hỏi quy trình nội bộ cho Dược sĩ. Không thực hiện thao tác ghi dữ liệu, "
        "không đưa ra tư vấn điều trị cá nhân.\nCâu hỏi: "
        + payload.message
    )
    return await _external_or_local(
        prompt=prompt,
        fallback=_local_process_answer(payload.message),
    )
