from dataclasses import dataclass

import httpx

from app.core.config import settings


class AIProviderUnavailable(RuntimeError):
    pass


class AIProviderFailure(RuntimeError):
    pass


@dataclass(frozen=True)
class AIProviderResult:
    text: str
    provider: str
    model: str | None


def provider_is_configured() -> bool:
    provider = settings.ai_provider.strip().lower()
    if provider == "demo":
        return True
    if provider == "disabled":
        return False
    if provider == "openai_compatible":
        return bool(settings.ai_api_key and settings.ai_base_url and settings.ai_model)
    return False


def _demo_process_answer(user_prompt: str) -> str:
    prompt_lower = user_prompt.lower()
    if "hết hạn" in prompt_lower or "hạn sử dụng" in prompt_lower:
        return (
            "Quy trình tham khảo:\n"
            "1. Lọc các lô còn tồn theo hạn sử dụng.\n"
            "2. Ưu tiên kiểm tra lô gần hết hạn và đối chiếu số lượng thực tế.\n"
            "3. Tách riêng lô đã hết hạn, không bán và báo Quản lý xử lý.\n"
            "4. Ghi nhận kết quả kiểm tra trong nghiệp vụ nhà thuốc."
        )
    if "kiểm kê" in prompt_lower or "tồn kho" in prompt_lower:
        return (
            "Quy trình tham khảo:\n"
            "1. Đối chiếu tồn hệ thống theo từng lô.\n"
            "2. Kiểm đếm số lượng thực tế.\n"
            "3. Ghi nhận chênh lệch và kiểm tra nguyên nhân.\n"
            "4. Chỉ cập nhật dữ liệu sau khi người có quyền xác nhận."
        )
    if "bán" in prompt_lower or "hóa đơn" in prompt_lower:
        return (
            "Quy trình tham khảo:\n"
            "1. Tra cứu thuốc và lô còn hạn sử dụng.\n"
            "2. Kiểm tra tồn khả dụng và giá bán của lô.\n"
            "3. Tạo hóa đơn nháp, kiểm tra lại số lượng.\n"
            "4. Chốt hóa đơn để trừ tồn. Không bán lô đã hết hạn."
        )
    return (
        "Tôi đang chạy ở chế độ AI demo an toàn. Tôi có thể giải thích quy trình nội bộ về "
        "tra cứu thuốc, tồn kho, lô thuốc, hạn sử dụng, bán thuốc và báo cáo. "
        "Tôi không chẩn đoán, kê đơn hoặc tự thay đổi dữ liệu."
    )


def _demo_generate(user_prompt: str) -> str:
    if "Câu hỏi của Quản lý:" in user_prompt or "Câu hỏi của Dược sĩ:" in user_prompt:
        return _demo_process_answer(user_prompt)

    if "Dữ liệu:" in user_prompt and "sắp hết hạn" in user_prompt.lower():
        data = user_prompt.split("Dữ liệu:", 1)[1].strip()
        return (
            "Báo cáo AI demo - thuốc sắp hết hạn\n"
            f"{data}\n\n"
            "Khuyến nghị nội bộ: kiểm tra thực tế các lô trên, ưu tiên lô có hạn gần nhất, "
            "không bán lô đã hết hạn và chuyển trường hợp cần xử lý cho Quản lý."
        )

    fact_lines = [
        line.strip()
        for line in user_prompt.splitlines()
        if ":" in line and not line.strip().startswith("Hãy ")
    ]
    if fact_lines:
        return (
            "Tóm tắt AI demo từ dữ liệu hệ thống:\n- "
            + "\n- ".join(fact_lines)
            + "\n\nChỉ sử dụng dữ liệu quản lý hiện có; không bổ sung chỉ định hoặc liều dùng."
        )

    return "AI demo đã nhận yêu cầu nhưng chưa có đủ dữ liệu để tạo nội dung tham khảo."


async def generate_ai_text(*, system_prompt: str, user_prompt: str) -> AIProviderResult:
    provider = settings.ai_provider.strip().lower()
    if provider == "demo":
        return AIProviderResult(
            text=_demo_generate(user_prompt),
            provider="demo",
            model="safe-template-v1",
        )

    api_key = settings.ai_api_key
    base_url_value = settings.ai_base_url
    model = settings.ai_model
    if provider != "openai_compatible" or not (api_key and base_url_value and model):
        raise AIProviderUnavailable("AI provider is not configured")

    endpoint = f"{base_url_value.rstrip('/')}/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "max_tokens": settings.ai_max_tokens,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
            response = await client.post(endpoint, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise AIProviderFailure("AI provider request failed") from exc

    try:
        text = str(data["choices"][0]["message"]["content"]).strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise AIProviderFailure("AI provider returned an invalid response") from exc

    if not text:
        raise AIProviderFailure("AI provider returned an empty response")
    return AIProviderResult(text=text, provider=provider, model=model)
