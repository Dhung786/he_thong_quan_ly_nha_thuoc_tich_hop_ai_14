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
    if provider == "disabled":
        return False
    if provider == "openai_compatible":
        return bool(settings.ai_api_key and settings.ai_base_url and settings.ai_model)
    return False


async def generate_ai_text(*, system_prompt: str, user_prompt: str) -> AIProviderResult:
    provider = settings.ai_provider.strip().lower()
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
