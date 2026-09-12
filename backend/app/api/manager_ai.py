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
AIUser = Annotated[User, Depends(require_roles("MANAGER", "PHARMACIST"))]
DbSession = Annotated[AsyncSession, Depends(get_db)]

DISCLAIMER = (
    "Nội dung AI chỉ dùng để tham khảo trong quản lý nhà thuốc; không thay thế quyết định "
    "chuyên môn của dược sĩ hoặc bác sĩ và không tự động thay đổi dữ liệu nghiệp vụ."
)

SYSTEM_SAFETY = """
Bạn là trợ lý AI của hệ thống quản lý nhà thuốc. Chỉ trả lời dựa trên dữ liệu và ngữ cảnh được cung cấp.
Không chẩn đoán bệnh, không kê đơn, không đề xuất liều dùng cá nhân, không tuyên bố thay thế bác sĩ/dược sĩ.
Không được nói rằng bạn đã thay đổi tồn kho, lô thuốc, hóa đơn, tài khoản hoặc cơ sở dữ liệu.
Nếu thiếu dữ liệu, hãy nói rõ là chưa đủ dữ liệu. Trả lời ngắn gọn, có cấu trúc, bằng tiếng Việt.
""".strip()


def _local_demo_available() -> bool:
    return settings.app_env.strip().lower() != "production"


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


async def _generate_or_local(*, prompt: str, local_text: str) -> AITextResponse:
    if provider_is_configured():
        try:
            result = await generate_ai_text(
                system_prompt=SYSTEM_SAFETY,
                user_prompt=prompt,
            )
            return _safe_response(result.text, result.provider, result.model)
        except AIProviderFailure as exc:
            if not _local_demo_available():
                raise _provider_error(exc) from exc

    if _local_demo_available():
        return _safe_response(local_text, "local_demo", "rule-based-v1")

    raise _provider_error(AIProviderUnavailable("AI provider is not configured"))


def _local_process_answer(message: str) -> str:
    normalized = " ".join(message.lower().split())

    if "hết hạn" in normalized or "hạn sử dụng" in normalized:
        return (
            "Quy trình tham khảo về hạn sử dụng:\n"
            "1. Mở mục Cảnh báo hoặc Hạn sử dụng.\n"
            "2. Lọc các lô sắp hết hạn theo khoảng ngày cần kiểm tra.\n"
            "3. Đối chiếu mã thuốc, mã lô, tồn hiện tại và ngày hết hạn.\n"
            "4. Tách riêng lô đã hết hạn khỏi luồng bán thuốc và báo người phụ trách xử lý.\n"
            "5. Lưu lại kết quả kiểm tra theo quy trình nội bộ của nhà thuốc."
        )

    if "kiểm kê" in normalized or "tồn kho" in normalized:
        return (
            "Quy trình tham khảo về kiểm kê tồn kho:\n"
            "1. Tra cứu tồn theo thuốc và theo từng lô.\n"
            "2. So sánh số lượng thực tế với số lượng trên hệ thống.\n"
            "3. Kiểm tra riêng các lô tồn thấp, hết hàng hoặc gần hết hạn.\n"
            "4. Ghi nhận chênh lệch để người có quyền xác minh trước khi điều chỉnh dữ liệu."
        )

    if "bán thuốc" in normalized or "hóa đơn" in normalized:
        return (
            "Quy trình tham khảo về bán thuốc:\n"
            "1. Tra cứu đúng thuốc và lô còn hạn sử dụng.\n"
            "2. Kiểm tra số lượng tồn khả dụng của lô được chọn.\n"
            "3. Thêm thuốc vào hóa đơn và kiểm tra số lượng, đơn giá, thành tiền.\n"
            "4. Người có quyền xác nhận giao dịch mới thực hiện chốt hóa đơn.\n"
            "5. Sau khi chốt, kiểm tra lại tồn kho và trạng thái hóa đơn."
        )

    if "nhập thuốc" in normalized or "nhà cung cấp" in normalized or "lô" in normalized:
        return (
            "Quy trình tham khảo về nhập thuốc và lô:\n"
            "1. Chọn nhà cung cấp và thuốc cần nhập.\n"
            "2. Nhập mã lô, số lượng, ngày nhập, hạn sử dụng, giá nhập và giá bán.\n"
            "3. Kiểm tra dữ liệu trước khi lưu.\n"
            "4. Sau khi lưu, tra cứu lại lô để xác nhận số lượng và hạn sử dụng."
        )

    return (
        "Tôi có thể hỗ trợ các quy trình nội bộ về thuốc, lô nhập, hạn sử dụng, tồn kho, "
        "nhà cung cấp, bán thuốc, hóa đơn, báo cáo và phân quyền. Hãy nêu rõ quy trình bạn "
        "muốn xem để nhận hướng dẫn từng bước."
    )


@router.get("/status", response_model=AIStatusResponse)
async def ai_status(_: AIUser) -> AIStatusResponse:
    external_ready = provider_is_configured()
    local_ready = _local_demo_available()
    if external_ready:
        provider = settings.ai_provider
        model = settings.ai_model
    elif local_ready:
        provider = "local_demo"
        model = "rule-based-v1"
    else:
        provider = settings.ai_provider
        model = settings.ai_model

    return AIStatusResponse(
        provider=provider,
        model=model,
        configured=external_ready or local_ready,
        scope_guard="enabled",
    )


@router.post("/medicine-summary", response_model=AITextResponse)
async def medicine_summary(
    payload: MedicineSummaryRequest,
    _: AIUser,
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
    local_text = "TÓM TẮT DỮ LIỆU THUỐC\n" + "\n".join(f"- {fact}" for fact in facts)
    return await _generate_or_local(prompt=prompt, local_text=local_text)


@router.post("/expiry-report", response_model=AITextResponse)
async def expiry_report(
    payload: ExpiryReportRequest,
    _: AIUser,
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
        f"Hãy tạo báo cáo quản lý thuốc sắp hết hạn trong {payload.warning_days} ngày, "
        f"tính từ {today.isoformat()}. Nêu số lượng lô cần chú ý, sắp xếp ưu tiên theo ngày "
        "hết hạn và gợi ý các bước kiểm tra nội bộ mà không tự động thay đổi dữ liệu.\n\n"
        "Dữ liệu:\n"
        + "\n".join(lines)
    )
    local_text = (
        f"BÁO CÁO HẠN SỬ DỤNG - {payload.warning_days} NGÀY\n"
        f"- Ngày kiểm tra: {today.isoformat()}\n"
        f"- Số lô cần chú ý: {len(rows)}\n\n"
        "DANH SÁCH ƯU TIÊN:\n"
        + "\n".join(lines)
        + "\n\nGỢI Ý KIỂM TRA NỘI BỘ:\n"
        "1. Đối chiếu tồn thực tế của từng lô.\n"
        "2. Kiểm tra lại ngày hết hạn trên bao bì.\n"
        "3. Tách riêng lô đã hết hạn hoặc có dấu hiệu bất thường.\n"
        "4. Người phụ trách quyết định xử lý theo quy trình của nhà thuốc."
    )
    return await _generate_or_local(prompt=prompt, local_text=local_text)


@router.post("/internal-chat", response_model=AITextResponse)
async def internal_chat(
    payload: InternalChatRequest,
    _: AIUser,
) -> AITextResponse:
    decision = validate_internal_chat_input(payload.message)
    if not decision.allowed:
        return AITextResponse(
            answer=safe_scope_rejection(decision.reason),
            provider="local_demo" if _local_demo_available() else settings.ai_provider,
            model="rule-based-v1" if _local_demo_available() else settings.ai_model,
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
    prompt = f"{process_context}\n\nCâu hỏi của người dùng hệ thống: {payload.message}"
    local_text = _local_process_answer(payload.message)
    return await _generate_or_local(prompt=prompt, local_text=local_text)
